const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');
const XLSX = require('xlsx');
const QRCode = require('qrcode');
const { sendToUser } = require('../services/pushNotification.service');
const { notifyUsersAboutLowStock } = require('../services/emailNotification.service');

const generateSku = (category, brand, name) => {
  const catPrefix = category.substring(0, 3).toUpperCase();
  const brandPrefix = brand ? brand.substring(0, 2).toUpperCase() : 'XX';
  const namePart = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${catPrefix}-${brandPrefix}-${namePart}-${random}`;
};

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, category, brand, isActive, sortBy, sortOrder } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const orderBy = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder || 'asc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy,
      skip,
      take: parseInt(limit),
      include: {
        images: { take: 1, where: { isPrimary: true } },
        suppliers: { include: { supplier: { select: { id: true, name: true } } } },
        _count: { select: { stockMovements: true } },
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  // Add low stock flag
  const itemsWithFlags = items.map((item) => ({
    ...item,
    isLowStock: item.currentStock <= item.minStock,
    isDeadStock: item.lastMovement && (new Date() - new Date(item.lastMovement)) > 90 * 24 * 60 * 60 * 1000,
  }));

  sendSuccess(res, itemsWithFlags, 'Inventory fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const item = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: {
      images: true,
      suppliers: {
        include: { supplier: true },
      },
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!item) throw new AppError('Item not found', 404);
  sendSuccess(res, item);
});

const create = catchAsync(async (req, res) => {
  const { name, barcode, category, subCategory, brand, model, unitType,
    currentStock, minStock, maxStock, purchasePrice, sellingPrice,
    gstRate, expiryDate, warrantyMonths, location, description, supplierIds } = req.body;

  const sku = generateSku(category, brand, name);

  // Generate QR code
  const qrData = JSON.stringify({ sku, name, category });
  const qrCode = await QRCode.toDataURL(qrData);

  const item = await prisma.inventory.create({
    data: {
      name,
      sku,
      barcode,
      category,
      subCategory,
      brand,
      model,
      unitType,
      currentStock: currentStock || 0,
      minStock: minStock || 5,
      maxStock: maxStock || 100,
      purchasePrice: Math.round((purchasePrice || 0) * 100), // convert to paise
      sellingPrice: Math.round((sellingPrice || 0) * 100),
      gstRate: gstRate || 'RATE_18',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      warrantyMonths: parseInt(warrantyMonths) || null,
      location,
      description,
      createdById: req.user.id,
    },
  });

  // Link suppliers
  if (supplierIds?.length) {
    await prisma.itemSupplier.createMany({
      data: supplierIds.map((supplierId) => ({
        itemId: item.id,
        supplierId,
      })),
    });
  }

  // Create initial stock movement
  if (currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'IN',
        quantity: currentStock,
        reason: 'Initial stock',
        oldStock: 0,
        newStock: currentStock,
        createdById: req.user.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Inventory',
      entityId: item.id,
      newValue: { name, sku },
    },
  });

  sendSuccess(res, item, 'Item created successfully', 201);
});

const update = catchAsync(async (req, res) => {
  const existing = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Item not found', 404);

  const { name, barcode, category, subCategory, brand, model, unitType,
    minStock, maxStock, purchasePrice, sellingPrice, gstRate,
    expiryDate, warrantyMonths, location, description, supplierIds } = req.body;

  const oldValue = { ...existing };

  const item = await prisma.inventory.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      barcode: barcode !== undefined ? barcode : existing.barcode,
      category: category || existing.category,
      subCategory: subCategory !== undefined ? subCategory : existing.subCategory,
      brand: brand !== undefined ? brand : existing.brand,
      model: model !== undefined ? model : existing.model,
      unitType: unitType || existing.unitType,
      minStock: minStock !== undefined ? parseInt(minStock) : existing.minStock,
      maxStock: maxStock !== undefined ? parseInt(maxStock) : existing.maxStock,
      purchasePrice: purchasePrice !== undefined ? Math.round(purchasePrice * 100) : existing.purchasePrice,
      sellingPrice: sellingPrice !== undefined ? Math.round(sellingPrice * 100) : existing.sellingPrice,
      gstRate: gstRate || existing.gstRate,
      expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate,
      warrantyMonths: warrantyMonths !== undefined ? parseInt(warrantyMonths) : existing.warrantyMonths,
      location: location !== undefined ? location : existing.location,
      description: description !== undefined ? description : existing.description,
      updatedById: req.user.id,
    },
  });

  // Update suppliers if provided
  if (supplierIds) {
    await prisma.itemSupplier.deleteMany({ where: { itemId: item.id } });
    if (supplierIds.length > 0) {
      await prisma.itemSupplier.createMany({
        data: supplierIds.map((supplierId) => ({ itemId: item.id, supplierId })),
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Inventory',
      entityId: item.id,
      oldValue,
      newValue: item,
    },
  });

  sendSuccess(res, item, 'Item updated successfully');
});

const delete_ = catchAsync(async (req, res) => {
  const existing = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Item not found', 404);

  await prisma.inventory.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Inventory',
      entityId: req.params.id,
      oldValue: { name: existing.name, sku: existing.sku },
    },
  });

  sendSuccess(res, null, 'Item deleted successfully');
});

const duplicate = catchAsync(async (req, res) => {
  const original = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!original) throw new AppError('Item not found', 404);

  const newSku = generateSku(original.category, original.brand, original.name);
  const item = await prisma.inventory.create({
    data: {
      name: `${original.name} (Copy)`,
      sku: newSku,
      category: original.category,
      subCategory: original.subCategory,
      brand: original.brand,
      model: original.model,
      unitType: original.unitType,
      purchasePrice: original.purchasePrice,
      sellingPrice: original.sellingPrice,
      gstRate: original.gstRate,
      minStock: original.minStock,
      maxStock: original.maxStock,
      location: original.location,
      description: original.description,
      createdById: req.user.id,
    },
  });

  sendSuccess(res, item, 'Item duplicated successfully', 201);
});

const adjustStock = catchAsync(async (req, res) => {
  const { quantity, reason, type } = req.body;
  const item = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError('Item not found', 404);

  const adjustment = parseInt(quantity);
  const oldStock = item.currentStock;
  const newStock = type === 'OUT' ? oldStock - adjustment : oldStock + adjustment;

  if (newStock < 0) throw new AppError('Insufficient stock', 400);

  const [updated] = await prisma.$transaction([
    prisma.inventory.update({
      where: { id: req.params.id },
      data: { currentStock: newStock, lastMovement: new Date(), updatedById: req.user.id },
    }),
    prisma.stockMovement.create({
      data: {
        itemId: req.params.id,
        type: type || (adjustment > 0 ? 'IN' : 'OUT'),
        quantity: Math.abs(adjustment),
        reason: reason || 'Manual adjustment',
        oldStock,
        newStock,
        createdById: req.user.id,
      },
    }),
  ]);

  // Create low stock notification if stock dropped below minStock
  if (type === 'OUT' && newStock <= item.minStock) {
    const notification = await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Low Stock Alert',
        message: `${item.name} (${item.sku}) has only ${newStock} units remaining after adjustment`,
        type: 'LOW_STOCK',
        reference: item.id,
      },
    });
    // Send push notification (non-blocking)
    sendToUser(req.user.id, notification).catch(() => {});
    // Send email notification to all users with emailNotify enabled (non-blocking)
    notifyUsersAboutLowStock([{
      name: item.name,
      sku: item.sku,
      currentStock: newStock,
      minStock: item.minStock,
      sellingPrice: item.sellingPrice,
    }]).catch(() => {});
  }

  sendSuccess(res, updated, 'Stock adjusted successfully');
});

const archive = catchAsync(async (req, res) => {
  const item = await prisma.inventory.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'ARCHIVE',
      entity: 'Inventory',
      entityId: req.params.id,
    },
  });

  sendSuccess(res, item, 'Item archived');
});

const getLowStock = catchAsync(async (req, res) => {
  const allItems = await prisma.inventory.findMany({
    where: { isActive: true },
    orderBy: { currentStock: 'asc' },
    include: { images: { take: 1, where: { isPrimary: true } } },
  });
  const items = allItems.filter((item) => item.currentStock <= item.minStock);
  sendSuccess(res, items);
});

const getDeadStock = catchAsync(async (req, res) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const items = await prisma.inventory.findMany({
    where: {
      isActive: true,
      lastMovement: { lte: ninetyDaysAgo },
    },
    orderBy: { lastMovement: 'asc' },
  });
  sendSuccess(res, items);
});

const exportExcel = catchAsync(async (req, res) => {
  const items = await prisma.inventory.findMany({
    where: { isActive: true },
    include: { suppliers: { include: { supplier: { select: { name: true } } } } },
  });

  const data = items.map((item) => ({
    SKU: item.sku,
    Name: item.name,
    Category: item.category,
    Brand: item.brand || '',
    'Current Stock': item.currentStock,
    'Min Stock': item.minStock,
    'Max Stock': item.maxStock,
    'Purchase Price': (item.purchasePrice / 100).toFixed(2),
    'Selling Price': (item.sellingPrice / 100).toFixed(2),
    'GST Rate': item.gstRate.replace('RATE_', '') + '%',
    Location: item.location || '',
    Suppliers: item.suppliers.map((s) => s.supplier.name).join(', '),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.utils.sheet_add_auto_filter(ws, XLSX.utils.decode_range(`A1:L${data.length + 1}`));

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=inventory-${Date.now()}.xlsx`);
  res.send(buffer);
});

const downloadTemplate = catchAsync(async (req, res) => {
  const template = [
    {
      Name: '',
      Category: 'PLUMBING',
      'Sub Category': '',
      Brand: '',
      Model: '',
      'Unit Type': 'PCS',
      'Current Stock': 0,
      'Min Stock': 5,
      'Max Stock': 100,
      'Purchase Price': 0,
      'Selling Price': 0,
      'GST Rate': 'RATE_18',
      Location: '',
      Description: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  // Add categories sheet
  const categories = ['PLUMBING', 'ELECTRICAL', 'PAINTING', 'HARDWARE', 'TOOLS', 'SANITARY', 'SAFETY_EQUIPMENT'];
  const units = ['PCS', 'LITERS', 'KG', 'METERS', 'BOXES', 'ROLLS', 'PAIRS'];
  const gstRates = ['RATE_0', 'RATE_5', 'RATE_12', 'RATE_18', 'RATE_28'];

  const metaWs = XLSX.utils.json_to_sheet([
    { 'Valid Categories': categories.join(', ') },
    { 'Valid Unit Types': units.join(', ') },
    { 'Valid GST Rates': gstRates.join(', ') },
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Valid Values');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=stockmate-import-template.xlsx');
  res.send(buffer);
});

const bulkImport = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('Excel file required', 400);

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const results = { success: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.Name) throw new Error('Name is required');
      if (!row.Category) throw new Error('Category is required');

      const sku = generateSku(row.Category, row.Brand, row.Name);
      
      await prisma.inventory.create({
        data: {
          name: row.Name,
          sku,
          category: row.Category,
          subCategory: row['Sub Category'] || null,
          brand: row.Brand || null,
          model: row.Model || null,
          unitType: row['Unit Type'] || 'PCS',
          currentStock: parseInt(row['Current Stock']) || 0,
          minStock: parseInt(row['Min Stock']) || 5,
          maxStock: parseInt(row['Max Stock']) || 100,
          purchasePrice: Math.round(parseFloat(row['Purchase Price'] || 0) * 100),
          sellingPrice: Math.round(parseFloat(row['Selling Price'] || 0) * 100),
          gstRate: row['GST Rate'] || 'RATE_18',
          location: row.Location || null,
          description: row.Description || null,
          createdById: req.user.id,
        },
      });
      results.success++;
    } catch (err) {
      results.errors.push({ row: i + 2, error: err.message });
    }
  }

  sendSuccess(res, results, `Imported ${results.success} items with ${results.errors.length} errors`);
});

const generatePdf = catchAsync(async (req, res) => {
  const item = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: {
      images: true,
      suppliers: { include: { supplier: true } },
      stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!item) throw new AppError('Item not found', 404);

  const { generateItemPDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateItemPDF(item, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=item-${item.sku}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

const exportPdf = catchAsync(async (req, res) => {
  const { search, category, brand, isActive, sortBy, sortOrder } = req.query;

  const where = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const orderBy = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder || 'asc';
  } else {
    orderBy.name = 'asc';
  }

  const items = await prisma.inventory.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      brand: true,
      currentStock: true,
      minStock: true,
      purchasePrice: true,
      sellingPrice: true,
      isActive: true,
    },
  });

  const { generateInventoryListPDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateInventoryListPDF(items, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=inventory-list-${Date.now()}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

module.exports = { getAll, getById, create, update, delete: delete_, duplicate, adjustStock, archive, getLowStock, getDeadStock, exportExcel, downloadTemplate, bulkImport, generatePdf, exportPdf };
