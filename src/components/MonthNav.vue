<script setup>
import { onMounted } from 'vue';

const props = defineProps({
  contentRegion: {
    type: String,
    required: true
  }
});

onMounted(() => {
  const monthList = document.getElementById('month-list');
  
  function updateMonthNav() {
    monthList.innerHTML = '';
    const monthSections = document.querySelectorAll('[data-month]');
    
    if (monthSections.length === 0) return;

    monthSections.forEach(section => {
      const yearMonth = section.getAttribute('data-month');
      const [year, month] = yearMonth.split('-');
      const date = new Date(year, month - 1);
      
      const formatter = new Intl.DateTimeFormat('default', {
        month: 'long',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
      
      const displayText = formatter.format(date);
      
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = displayText;
      link.href = `#section-${yearMonth}`;
      link.setAttribute('data-month-link', yearMonth);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        section.scrollIntoView({ behavior: 'smooth' });
      });
      li.appendChild(link);
      monthList.appendChild(li);
    });

    // Track all visible sections and their positions
    let visibleSections = new Map();

    const observer = new IntersectionObserver((entries) => {
      // Update visibility status for all entries
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const rect = entry.target.getBoundingClientRect();
          const distanceFromTarget = Math.abs(rect.top - 100); // 100px from top
          visibleSections.set(entry.target, distanceFromTarget);
        } else {
          visibleSections.delete(entry.target);
        }
      });

      // Find the section closest to our target position
      if (visibleSections.size > 0) {
        const closestSection = Array.from(visibleSections.entries())
          .reduce((closest, current) => current[1] < closest[1] ? current : closest);

        // Remove active class and aria-current from all links
        document.querySelectorAll('[data-month-link]').forEach(link => {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        });

        // Add active class and aria-current to the closest section's link
        const month = closestSection[0].getAttribute('data-month');
        const link = document.querySelector(`[data-month-link="${month}"]`);
        if(link){
          link.classList.add('active');
          link.setAttribute('aria-current', 'location');
        }
      }
    }, { 
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      rootMargin: '-100px 0px -50% 0px'
    });

    monthSections.forEach(section => observer.observe(section));
  }

  const contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        updateMonthNav();
        break;
      }
    }
  });

  contentObserver.observe(document.querySelector(props.contentRegion), {
    childList: true,
    subtree: true
  });

  updateMonthNav();
});
</script>

<template>
  <nav aria-label="Jump to month" class="month-nav pr-xl">
    <ul role="list" id="month-list" class="month-list">
      <!-- Month links will be populated by JavaScript -->
    </ul>
  </nav>
</template>

<style>
.month-nav {
  font-size: var(--p-step--1);
  position: sticky;
  top: var(--p-space-3xl);
}

.month-list a {
  display: block;
  color: inherit;
  text-decoration: none;
  width: 100%;
}

.month-list a:hover {
  text-decoration: underline;
}

.month-list a.active {
  transition: all 0.2s ease;
  text-decoration: underline;
  color: var(--sl-color-primary-600);
}

</style>
