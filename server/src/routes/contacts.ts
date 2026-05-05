import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── Contacts ──

router.get('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });
  return res.json({ contacts: contacts.map(fmt) });
});

router.post('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@')) return res.status(400).json({ error: 'Invalid email' });
  const contact = await prisma.contact.create({
    data: { userId: user.id, name: name.trim(), email: trimmed, phone: phone?.trim() || null },
  });
  return res.status(201).json({ contact: fmt(contact) });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, email, phone } = req.body;
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) return res.status(400).json({ error: 'Invalid email' });
    data.email = trimmed;
  }
  if (phone !== undefined) data.phone = phone?.trim() || null;
  const updated = await prisma.contact.update({ where: { id: req.params.id }, data });
  return res.json({ contact: fmt(updated) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  await prisma.contact.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

// ── Groups ──

router.get('/groups', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const groups = await prisma.contactGroup.findMany({
    where: { userId: user.id },
    include: { members: { include: { contact: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ groups: groups.map(fmtGroup) });
});

router.post('/groups', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const group = await prisma.contactGroup.create({
    data: { userId: user.id, name: name.trim() },
    include: { members: { include: { contact: true } } },
  });
  return res.status(201).json({ group: fmtGroup(group) });
});

router.patch('/groups/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.body;
  const group = await prisma.contactGroup.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const updated = await prisma.contactGroup.update({
    where: { id: req.params.id },
    data: { name: name?.trim() },
    include: { members: { include: { contact: true } } },
  });
  return res.json({ group: fmtGroup(updated) });
});

router.delete('/groups/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const group = await prisma.contactGroup.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  await prisma.contactGroup.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

router.post('/groups/:id/members', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { contact_ids } = req.body;
  if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
    return res.status(400).json({ error: 'contact_ids array required' });
  }

  const group = await prisma.contactGroup.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  for (const contactId of contact_ids) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: user.id } });
    if (!contact) continue;
    await prisma.contactGroupMember.upsert({
      where: { groupId_contactId: { groupId: req.params.id, contactId } },
      update: {},
      create: { groupId: req.params.id, contactId },
    });
  }

  const updated = await prisma.contactGroup.findUnique({
    where: { id: req.params.id },
    include: { members: { include: { contact: true } } },
  });
  return res.json({ group: fmtGroup(updated!) });
});

router.delete('/groups/:id/members/:contactId', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const group = await prisma.contactGroup.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  await prisma.contactGroupMember.deleteMany({
    where: { groupId: req.params.id, contactId: req.params.contactId },
  });
  return res.json({ ok: true });
});

function fmt(c: any) {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone || null, created_at: c.createdAt };
}

function fmtGroup(g: any) {
  return {
    id: g.id,
    name: g.name,
    created_at: g.createdAt,
    members: (g.members || []).map((m: any) => fmt(m.contact)),
  };
}

export default router;
