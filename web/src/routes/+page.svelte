<script>
	export let data;
</script>

<svelte:head>
	<title>Home - ToS;DR</title>
	<meta name="description" content="An automated watchdog for Terms of Service and Privacy Policy updates from major tech companies." />
</svelte:head>

<div class="hero">
	<h1>Stay Informed</h1>
	<p>An automated watchdog for Terms of Service and Privacy Policy updates from major tech companies.</p>
</div>

<div class="service-grid">
	{#each data.services as service}
		<a href={`/services/${service.id}`} class="service-card glass">
			<div class="card-content">
				<img
					src={`/favicons/${service.name}.ico`}
					alt="{service.name} Favicon"
					class="favicon"
					on:error={(e) => (e.target.style.display = 'none')}
				/>
				<h3>{service.name}</h3>
				{#if service.lastUpdate}
					<p class="last-update">
						{#if service.updateType === 'change'}
							Last change:
						{:else}
							No changes since
						{/if}
						{new Date(service.lastUpdate).toLocaleDateString()}
					</p>
				{/if}
			</div>
		</a>
	{/each}
</div>

<style>
	.hero {
		text-align: center;
		margin: 4rem 0 6rem;
	}

	.hero h1 {
		font-size: 4rem;
		margin-bottom: 1rem;
		background: -webkit-linear-gradient(45deg, var(--text-primary), var(--text-secondary));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.hero p {
		font-size: 1.25rem;
		color: var(--text-secondary);
		max-width: 60ch;
		margin: 0 auto;
	}

	.service-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 2rem;
		padding-bottom: 4rem;
	}

	.service-card {
		aspect-ratio: 1 / 1;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		position: relative;
	}
	
	.service-card:hover {
		transform: scale(1.05) translateY(-10px);
		box-shadow: 0 16px 40px rgba(0,0,0,0.2);
	}

	.card-content {
		padding: 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--text-primary);
	}

	.favicon {
		width: 64px;
		height: 64px;
		object-fit: contain;
		margin-bottom: 0.5rem;
		filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
	}

	.service-card h3 {
		margin: 0;
		font-size: 2rem;
		color: var(--text-primary);
	}

	.last-update {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0;
	}
</style>
