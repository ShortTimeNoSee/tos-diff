<script>
  export let data;

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
</script>

<div class="hero">
  <h1>Track Legal Document Changes</h1>
  <p>An automated watchdog for Terms of Service and Privacy Policy updates from major tech companies.</p>
</div>

<div class="service-grid">
  {#each data.services as service}
    <a href={`/services/${service.id}`} class="service-card">
      <img src={`/favicons/${service.name}.ico`} alt="{service.name} Favicon" class="favicon" on:error={(e) => e.target.style.display = 'none'}>
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
    </a>
  {/each}
</div>

<style>
  .hero {
    text-align: center;
    margin-bottom: 4rem;
  }

  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .hero p {
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 60ch;
    margin: 0 auto;
  }

  .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .service-card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .favicon {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  .service-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  .service-card h3 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .last-update {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
  }
</style>
