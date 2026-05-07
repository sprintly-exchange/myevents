import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function getOwnedEvent(eventId: string, userId: string) {
  return prisma.event.findFirst({ where: { id: eventId, creatorId: userId, status: { not: 'deleted' } } });
}

router.get('/:eventId/guidance', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const items = await prisma.eventGuidanceItem.findMany({
    where: { eventId: req.params.eventId },
    orderBy: { sortOrder: 'asc' },
  });
  return res.json({ items });
});

router.post('/:eventId/guidance', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  const maxOrder = await prisma.eventGuidanceItem.findFirst({
    where: { eventId: req.params.eventId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const item = await prisma.eventGuidanceItem.create({
    data: {
      eventId: req.params.eventId,
      title,
      body,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    },
  });
  return res.status(201).json({ item });
});

router.put('/:eventId/guidance/:itemId', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  const existing = await prisma.eventGuidanceItem.findFirst({
    where: { id: req.params.itemId, eventId: req.params.eventId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const item = await prisma.eventGuidanceItem.update({
    where: { id: req.params.itemId },
    data: { title, body },
  });
  return res.json({ item });
});

router.delete('/:eventId/guidance/:itemId', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const existing = await prisma.eventGuidanceItem.findFirst({
    where: { id: req.params.itemId, eventId: req.params.eventId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  await prisma.eventGuidanceItem.delete({ where: { id: req.params.itemId } });
  return res.json({ message: 'Deleted' });
});

router.patch('/:eventId/guidance/reorder', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const event = await getOwnedEvent(req.params.eventId, userId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of ids' });

  await Promise.all(
    order.map((id: string, index: number) =>
      prisma.eventGuidanceItem.updateMany({
        where: { id, eventId: req.params.eventId },
        data: { sortOrder: index },
      })
    )
  );
  return res.json({ message: 'Reordered' });
});

export default router;
