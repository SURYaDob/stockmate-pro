const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const getCompanyProfile = catchAsync(async (req, res) => {
  let profile = await prisma.companyProfile.findFirst();
  if (!profile) {
    // Auto-create a default profile
    profile = await prisma.companyProfile.create({
      data: {
        companyName: 'My Business',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        logoUrl: null,
        footerText: 'Thank you for your business!',
      },
    });
  }
  sendSuccess(res, profile);
});

const updateCompanyProfile = catchAsync(async (req, res) => {
  const { companyName, address, phone, email, gstNumber, logoUrl, footerText } = req.body;

  let profile = await prisma.companyProfile.findFirst();
  if (!profile) {
    profile = await prisma.companyProfile.create({ data: { companyName: 'My Business' } });
  }

  const updated = await prisma.companyProfile.update({
    where: { id: profile.id },
    data: {
      companyName: companyName !== undefined ? companyName : profile.companyName,
      address: address !== undefined ? address : profile.address,
      phone: phone !== undefined ? phone : profile.phone,
      email: email !== undefined ? email : profile.email,
      gstNumber: gstNumber !== undefined ? gstNumber : profile.gstNumber,
      logoUrl: logoUrl !== undefined ? logoUrl : profile.logoUrl,
      footerText: footerText !== undefined ? footerText : profile.footerText,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'CompanyProfile',
      entityId: profile.id,
      newValue: { companyName: updated.companyName },
    },
  });

  sendSuccess(res, updated, 'Company profile updated');
});

module.exports = { getCompanyProfile, updateCompanyProfile };
