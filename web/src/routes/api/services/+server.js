import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const configDir = path.resolve('../service-config');
    const files = await fs.readdir(configDir);

    const services = await Promise.all(files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const filePath = path.join(configDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const config = JSON.parse(fileContent);
        return {
          id: file.replace('.json', ''),
          name: config.service
        };
      })
    );

    return new Response(JSON.stringify(services), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Failed to list services:', error);
    return new Response(JSON.stringify({ error: 'Could not load services' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 