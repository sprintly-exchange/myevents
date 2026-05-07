import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function getOwnedEvent(eventId: string, userId: string) {
  return prisma.event.findFirst({ where: { id: eventId, creatorId: userId, status: { not: 'deleted' } } });
}

router.get('/:eventId/agenda', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const items = await prisma.eventAgendaItem.findMany({
    where: { eventId: req.params.eventId },
    orderBy: { sortOrder: 'asc' },
  });
  return res.json({ items });
});

router.post('/:eventId/agenda', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, start_time, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const maxOrder = await prisma.eventAgendaItem.findFirst({
    where: { eventId: req.params.eventId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const item = await prisma.eventAgendaItem.create({
    data: {
      eventId: req.params.eventId,
      title,
      startTime: start_time || null,
      description: description || null,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    },
  });
  return res.status(201).json({ item });
});

router.put('/:eventId/agenda/:itemId', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, start_time, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const existing = await prisma.eventAgendaItem.findFirst({
    where: { id: req.params.itemId, eventId: req.params.eventId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const item = await prisma.eventAgendaItem.update({
    where: { id: req.params.itemId },
    data: { title, startTime: start_time || null, description: description || null },
  });
  return res.json({ item });
});

router.delete('/:eventId/agenda/:itemId', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const existing = await prisma.eventAgendaItem.findFirst({
    where: { id: req.params.itemId, eventId: req.params.eventId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  await prisma.eventAgendaItem.delete({ where: { id: req.params.itemId } });
  return res.json({ message: 'Deleted' });
});

router.patch('/:eventId/agenda/reorder', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { order } = req.body; // array of ids in new order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of ids' });

  await Promise.all(
    order.map((id: string, index: number) =>
      prisma.eventAgendaItem.updateMany({
        where: { id, eventId: req.params.eventId },
        data: { sortOrder: index },
      })
    )
  );
  return res.json({ message: 'Reordered' });
});

export default router;
