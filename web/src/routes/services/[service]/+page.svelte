<script>
  export let data;

  let activeTab = data.activeTab;
  
  function setActiveTab(tab) {
    activeTab = tab;
  }
</script>

<h1><a href="/">{data.service}</a> Legal Document Changes</h1>

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
            <h2>{new Date(change.timestamp).toLocaleString()}</h2>
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
  h1 a {
    text-decoration: none;
    color: inherit;
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

  section h2 {
    font-size: 1rem;
    font-weight: normal;
    color: var(--text-secondary);
    margin-top: 0;
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
