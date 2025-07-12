export async function load({ params, fetch }) {
  try {
    const svc = params.service.toLowerCase();

    // 1. Fetch the list of documents for the service
    const docsRes = await fetch(`/api/services/${svc}`);
    if (!docsRes.ok) {
      // Return a default structure if the service config doesn't exist.
      return { service: params.service, documents: {}, activeTab: null };
    }
    const { documents: docNames } = await docsRes.json();

    // 2. Create fetch promises for each document's changes
    const slugify = (text) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const promises = docNames.map(docName =>
      fetch(`/data/${svc}/${slugify(docName)}/changes.json`)
    );
    const results = await Promise.allSettled(promises);

    // 3. Process results into a structured object
    const documents = {};
    for (let i = 0; i < docNames.length; i++) {
      const docName = docNames[i];
      const res = results[i];
      let changes = [];
      if (res.status === 'fulfilled' && res.value.ok) {
        const data = await res.value.json();
        // Support both old and new schema versions
        changes = data.changes || (Array.isArray(data) ? data : []);
      }
      documents[docName] = { changes };
    }

    // 4. Return props for the page
    return {
      service: params.service,
      documents,
      // Set the first available document as the active one
      activeTab: docNames.length > 0 ? docNames[0] : null
    };

  } catch (error) {
    console.error("Failed to load service changes:", error);
    // Return default props on error to prevent a crash
    return {
      service: params.service,
      documents: {},
      activeTab: null
    };
  }
} 