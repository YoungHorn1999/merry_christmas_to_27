import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { blobs } = await list();

    // Return all blob URLs (filtering handled by upload side)
    const imageUrls = blobs.map(blob => blob.url);

    res.status(200).json(imageUrls);
  } catch (error) {
    console.error('Error listing blobs:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
}
