<script>
	export let data;

	let activeTab = data.activeTab;

	function setActiveTab(tab) {
		activeTab = tab;
		const url = new URL(window.location);
		url.searchParams.set('policy', tab);
		window.history.replaceState({}, '', url);
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

<svelte:head>
	<title>{data.service} | Legal Changes</title>
</svelte:head>

<div class="page-layout">
	{#if data.documents && Object.keys(data.documents).length > 0}
		<aside class="sidebar glass">
			<nav>
				<h4>Documents</h4>
				<ul>
					{#each Object.keys(data.documents) as docName}
						<li>
							<button
								class:active={activeTab === docName}
								on:click={() => setActiveTab(docName)}
							>
								<span>{docName}</span>
								<span class="change-count">{data.documents[docName].changes.length}</span>
							</button>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>

		<div class="content">
			{#if activeTab && data.documents[activeTab]}
				{@const currentDoc = data.documents[activeTab]}
				<div class="content-header">
					<h1>{activeTab}</h1>
					<p>Last checked: {new Date(currentDoc.lastChecked).toLocaleString()}</p>
				</div>

				{#if currentDoc.changes.length === 0}
					<div class="no-changes glass">
						<p>No changes detected for {activeTab}.</p>
					</div>
				{:else}
					{#each currentDoc.changes as change}
						<section class="change-card glass">
							<div class="change-meta">
								<h2 class="timestamp">{new Date(change.timestamp).toLocaleString()}</h2>
								<div class="meta-controls">
									{#if change.sourceHtmlFile}
										<a
											href="/data/{data.service.toLowerCase()}/{activeTab
												.toLowerCase()
												.replace(/\s+/g, '-')}/{change.sourceHtmlFile}"
											target="_blank"
											class="source-link"
										>
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
											<span class="hash-short">{change.sourceHash.substring(0, 12)}...</span>
											<span class="hash-full">{change.sourceHash}</span>
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
			{/if}
		</div>
	{:else}
		<div class="no-changes glass">
			<p>No documents are configured for this service yet.</p>
		</div>
	{/if}
</div>

<style>
	.page-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 2rem;
		align-items: flex-start;
	}

	.sidebar {
		position: sticky;
		top: calc(2rem + 100px); /* Header height + margin */
		padding: 1.5rem;
	}

	.sidebar h4 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
		padding: 0 1rem;
	}

	.sidebar ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidebar button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1rem;
		color: var(--text-secondary);
		border-radius: 12px;
		text-align: left;
		transition: all var(--transition-speed) ease;
	}

	.sidebar button:hover {
		background: var(--glass-border);
		color: var(--text-primary);
	}

	.sidebar button.active {
		background: var(--accent);
		color: white;
		font-weight: 700;
	}

	@media (prefers-color-scheme: dark) {
		.sidebar button.active {
			color: var(--background-dark);
		}
	}

	.change-count {
		font-size: 0.8rem;
		background: rgba(0, 0, 0, 0.1);
		padding: 0.1rem 0.4rem;
		border-radius: 6px;
	}
	.sidebar button.active .change-count {
		background: rgba(255, 255, 255, 0.2);
	}

	.content-header {
		margin-bottom: 2rem;
	}

	.content-header h1 {
		font-size: 3rem;
		margin: 0 0 0.5rem 0;
	}

	.content-header p {
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.no-changes {
		padding: 4rem;
		text-align: center;
	}

	.no-changes p {
		font-size: 1.2rem;
		color: var(--text-secondary);
	}

	.change-card {
		margin-bottom: 2rem;
		padding: 2rem;
	}

	.change-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--glass-border);
	}

	.meta-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.timestamp {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin: 0;
	}

	.source-link,
	.source-hash {
		font-size: 0.9rem;
		color: var(--text-secondary);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		transition: all var(--transition-speed) ease;
		background-color: transparent;
		border: 1px solid var(--glass-border);
		cursor: pointer;
	}

	.source-link:hover,
	.source-hash:hover {
		background-color: var(--glass-border);
		color: var(--text-primary);
		border-color: transparent;
	}

	.source-hash {
		font-family: 'Roboto Mono', monospace;
	}
	.source-hash .hash-full {
		display: none;
	}

	.summary {
		margin: 1.5rem 0;
		font-size: 1.1rem;
		line-height: 1.7;
	}

	.summary :global(p) {
		margin: 0.5rem 0;
	}

	details {
		margin-top: 1.5rem;
	}

	details summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--text-primary);
		padding: 0.5rem;
		border-radius: 8px;
	}

	details summary:hover {
		background: var(--glass-border);
	}

	.diff {
		margin-top: 1rem;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 12px;
		font-family: 'Roboto Mono', monospace;
		white-space: pre-wrap;
		font-size: 0.9em;
		border: 1px solid var(--glass-border);
	}

	@media (prefers-color-scheme: dark) {
		.diff {
			background: rgba(0, 0, 0, 0.2);
		}
	}
</style>
