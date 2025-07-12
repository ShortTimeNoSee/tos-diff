<script>
  export let data;

  let activeTab = data.activeTab;

  function setActiveTab(tab) {
    activeTab = tab;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Hash copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
</script>

<h1>{data.service} Legal Document Changes</h1>

{#if data.documents && Object.keys(data.documents).length > 0}
  <div class="tabs">
    {#each Object.keys(data.documents) as docName}
      <button
        class:active={activeTab === docName}
        on:click={() => setActiveTab(docName)}
        disabled={data.documents[docName].changes.length === 0}
      >
        {docName} ({data.documents[docName].changes.length})
      </button>
    {/each}
  </div>

  {#if activeTab && data.documents[activeTab]}
    {@const currentDoc = data.documents[activeTab]}
    <div class="content">
      {#if currentDoc.changes.length === 0}
        <p>No {activeTab} changes detected yet.</p>
      {:else}
        {#each currentDoc.changes as change}
          <section>
            <div class="change-meta">
              <h2>{new Date(change.timestamp).toLocaleString()}</h2>
              <div class="meta-controls">
                {#if change.sourceHtmlFile}
                  <a href="/data/{data.service.toLowerCase()}/{activeTab.toLowerCase().replace(/\s+/g, '-')}/{change.sourceHtmlFile}" target="_blank" class="source-link">
                    View Source
                  </a>
                {/if}
                {#if change.sourceHash}
                  <button
                    type="button"
                    class="source-hash"
                    title="Click to copy full hash: {change.sourceHash}"
                    on:click={() => copyToClipboard(change.sourceHash)}
                  >
                    Source Hash: {change.sourceHash.substring(0, 12)}...
                  </button>
                {/if}
              </div>
            </div>
            <div class="summary">
              {@html change.summary.join('')}
            </div>
            <details>
              <summary>View full diff</summary>
              <div class="diff">
                {@html change.diffHtml}
              </div>
            </details>
          </section>
        {/each}
      {/if}
    </div>
  {/if}
{:else}
  <p>No documents are configured for this service yet.</p>
{/if}

<style>
  h1 {
    text-transform: none;
  }
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border);
  }

  .tabs button {
    padding: 0.75rem 1.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    font-size: 1rem;
    color: var(--text-secondary);
    position: relative;
    top: 1px;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .tabs button:disabled {
    color: var(--text-secondary);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tabs button.active {
    background: var(--background);
    color: var(--primary);
    border-bottom: 2px solid var(--primary);
  }

  .tabs button:not(.active):not(:disabled):hover {
    background-color: var(--surface);
    color: var(--text-primary);
  }

  .content {
    margin-top: 1rem;
  }

  section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background-color: var(--surface);
  }

  .change-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .meta-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  section h2 {
    font-size: 1rem;
    font-weight: normal;
    color: var(--text-secondary);
    margin: 0;
  }

  .source-link {
    font-size: 0.8em;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .source-link:hover {
    background-color: var(--border);
    text-decoration: underline;
  }

  .source-hash {
    font-family: 'Roboto Mono', monospace;
    font-size: 0.8em;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    background: none;
    border: none;
    text-align: left;
  }

  .source-hash:hover {
    background-color: var(--border);
  }

  .summary {
    margin: 1rem 0;
  }

  .summary :global(p) {
    margin: 0.5rem 0;
  }

  details {
    margin-top: 1.5rem;
  }

  details summary {
    cursor: pointer;
    font-weight: bold;
    color: var(--text-secondary);
  }

  details summary:hover {
    color: var(--primary);
  }

  .diff {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--background);
    border-radius: 4px;
    font-family: 'Roboto Mono', monospace;
    white-space: pre-wrap;
    font-size: 0.9em;
    border: 1px solid var(--border);
  }
</style>
