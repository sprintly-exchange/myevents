import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: 'desc' } });
  return res.json({ templates });
});

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, html_content, is_system } = req.body;
  if (!name || !html_content)
    return res.status(400).json({ error: 'Name and html_content required' });
  const template = await prisma.template.create({ data: { name, htmlContent: html_content, isSystem: !!is_system } });
  return res.status(201).json({ template });
});

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  const { name, html_content, is_system } = req.body;
  const template = await prisma.template.update({ where: { id: req.params.id }, data: { name, htmlContent: html_content, isSystem: !!is_system } });
  return res.json({ template });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.isSystem) return res.status(403).json({ error: 'Cannot delete system templates' });
  await prisma.template.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Template deleted' });
});

export default router;
