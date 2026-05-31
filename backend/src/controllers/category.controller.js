const { prisma } = require('../utils/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const categories = await prisma.categorySetting.findMany({
    orderBy: { name: 'asc' },
  });

  // Also return the enum categories with default themes
  const enumCategories = [
    { name: 'Plumbing', slug: 'plumbing', icon: '🔧', theme: 'slate', accent: '#475569' },
    { name: 'Electrical', slug: 'electrical', icon: '⚡', theme: 'amber', accent: '#f97316' },
    { name: 'Painting', slug: 'painting', icon: '🎨', theme: 'slate', accent: '#64748b' },
    { name: 'Hardware', slug: 'hardware', icon: '🔩', theme: 'slate', accent: '#334155' },
    { name: 'Tools', slug: 'tools', icon: '🛠️', theme: 'amber', accent: '#ea580c' },
    { name: 'Sanitary', slug: 'sanitary', icon: '🚿', theme: 'slate', accent: '#475569' },
    { name: 'Safety Equipment', slug: 'safety-equipment', icon: '🦺', theme: 'amber', accent: '#c2410c' },
  ];

  sendSuccess(res, { custom: categories, defaults: enumCategories });
});

module.exports = { getAll };
