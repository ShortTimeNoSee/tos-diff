<script>
	import './+layout.css';
</script>

<div class="layout-container">
	<header class="glass">
		<a href="/" class="title">
			<span class="main-title">Terms of Service;</span>
			<span class="subtitle">Didn't Read</span>
		</a>
		<nav>
			<a href="/disclaimer">Disclaimer</a>
		</nav>
	</header>

	<main>
		<slot />
	</main>
</div>

<style>
	.layout-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2.5rem;
		margin: 2rem 0;
		position: sticky;
		top: 2rem;
		z-index: 100;
	}

	.title {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}

	.main-title {
		font-size: 1.75rem;
		font-weight: 900;
		color: var(--text-primary);
		letter-spacing: -0.05em;
	}

	.subtitle {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-secondary);
		letter-spacing: -0.02em;
	}

	nav a {
		font-weight: 500;
		font-size: 1rem;
		color: var(--text-secondary);
		padding: 0.5rem 1rem;
		border-radius: 999px;
		transition: all var(--transition-speed) ease;
	}

	nav a:hover {
		color: var(--text-primary);
		background: var(--glass-bg);
	}

	main {
		padding: 1rem 0;
	}
</style>
