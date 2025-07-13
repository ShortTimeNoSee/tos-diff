import fs from 'fs/promises';
import path from 'path';

export async function load() {
  const projectRoot = path.resolve('..');
  const cfgDir = path.join(projectRoot, 'service-config');
  const dataDir = path.join(projectRoot, 'web/static/data');
  const storageDir = path.join(projectRoot, 'scraper/storage');
  
  const files = await fs.readdir(cfgDir);
  
  const services = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async (f) => {
        const serviceId = f.replace('.json', '');
        
        const serviceCfgPath = path.join(cfgDir, f);
        const serviceCfg = JSON.parse(await fs.readFile(serviceCfgPath, 'utf-8'));
        const serviceName = serviceCfg.service;
        
        let mostRecentUpdate = null;
        let updateType = '';
        
        if (serviceCfg.documents) {
          for (const docType in serviceCfg.documents) {
            const docSlug = docType.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            
            const changesPath = path.join(dataDir, serviceId, docSlug, 'changes.json');
            try {
              const changesFile = await fs.readFile(changesPath, 'utf-8');
              const changesData = JSON.parse(changesFile);
              if (changesData.changes && changesData.changes.length > 0) {
                const latestChangeTimestamp = new Date(changesData.changes[0].timestamp);
                if (!mostRecentUpdate || latestChangeTimestamp > mostRecentUpdate) {
                  mostRecentUpdate = latestChangeTimestamp;
                  updateType = 'change';
                }
              }
            } catch {
              // No changes file, check for initial scrape
              const storagePath = path.join(storageDir, serviceName, docSlug, 'prev.html');
              try {
                const stats = await fs.stat(storagePath);
                if (!mostRecentUpdate || stats.mtime > mostRecentUpdate) {
                  mostRecentUpdate = stats.mtime;
                  updateType = 'scrape';
                }
              } catch {
                // No storage file either
              }
            }
          }
        }
        
        return {
          id: serviceId,
          name: serviceName,
          lastUpdate: mostRecentUpdate ? mostRecentUpdate.toISOString() : null,
          updateType: mostRecentUpdate ? updateType : null,
        };
      })
  );

  return { services };
} 