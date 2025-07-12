<script>
  import services from '$lib/services.js';
</script>

<h1>Terms of Service Tracker</h1>
<ul>
  {#each services as svc}
    <li><a href={`/services/${svc}`}>{svc}</a></li>
  {/each}
</ul>
