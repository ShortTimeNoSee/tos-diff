export async function load({ params, fetch }) {
  try {
    const svc = params.service.toLowerCase();

    const docsRes = await fetch(`/api/services/${svc}`);
    if (!docsRes.ok) {
      return { service: params.service, documents: {}, activeTab: null };
    }
    const { serviceName, documents: docNames } = await docsRes.json();

    const slugify = (text) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const promises = docNames.map(docName =>
      fetch(`/data/${svc}/${slugify(docName)}/changes.json`)
    );
    const results = await Promise.allSettled(promises);

    const documents = {};
    for (let i = 0; i < docNames.length; i++) {
      const docName = docNames[i];
      const res = results[i];
      let changes = [];
      if (res.status === 'fulfilled' && res.value.ok) {
        const data = await res.value.json();
        changes = data.changes || (Array.isArray(data) ? data : []);
      }
      documents[docName] = { changes };
    }

    return {
      service: serviceName,
      documents,
      activeTab: docNames.length > 0 ? docNames[0] : null
    };

  } catch (error) {
    console.error("Failed to load service changes:", error);
    return {
      service: params.service,
      documents: {},
      activeTab: null
    };
  }
} 