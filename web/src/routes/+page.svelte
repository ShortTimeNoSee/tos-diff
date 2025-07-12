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
      <h3>{service.name}</h3>
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
    text-align: center;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
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
</style>
