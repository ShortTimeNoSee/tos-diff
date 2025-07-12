import fs from 'fs/promises';
import path from 'path';

export async function GET({ params }) {
  try {
    const serviceName = params.service.toLowerCase();
    
    const configPath = path.resolve('../service-config', `${serviceName}.json`);
    
    const fileContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(fileContent);
    
    const documents = Object.keys(config.documents || {});
    
    return new Response(JSON.stringify({
      serviceName: config.service,
      documents
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Service not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 