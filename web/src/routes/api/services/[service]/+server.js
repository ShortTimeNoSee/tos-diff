import fs from 'fs/promises';
import path from 'path';

export async function GET({ params }) {
  try {
    const serviceName = params.service.toLowerCase();
    
    // Construct the path to the config file from the project root.
    const configPath = path.resolve('service-config', `${serviceName}.json`);
    
    const fileContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(fileContent);
    
    const documents = Object.keys(config.documents || {});
    
    return new Response(JSON.stringify({ documents }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // If the file doesn't exist or there's an error, return a 404.
    return new Response(JSON.stringify({ error: 'Service not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 