export async function load({ fetch }) {
  try {
    const res = await fetch('/api/services');
    if (!res.ok) {
      console.error('Failed to fetch services list');
      return { services: [] };
    }
    const services = await res.json();
    return { services };
  } catch (error) {
    console.error('Error loading services:', error);
    return { services: [] };
  }
} 