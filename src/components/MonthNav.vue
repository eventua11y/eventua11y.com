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
    // Add a hard-coded "Today" link as the first item
    const todayLi = document.createElement('li');
    const todayLink = document.createElement('a');
    todayLink.textContent = 'Today';
    todayLink.href = '#today';
    todayLink.setAttribute('data-month-link', 'today');
    todayLink.addEventListener('click', (e) => {
      e.preventDefault();
      const todaySection = document.getElementById('today');
      if (todaySection) {
        todaySection.scrollIntoView({ behavior: 'smooth' });
        if (!todaySection.hasAttribute('tabindex')) {
          todaySection.setAttribute('tabindex', '-1');
        }
        todaySection.focus({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    todayLi.appendChild(todayLink);
    monthList.appendChild(todayLi);

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
        // Ensure the target section receives keyboard focus for accessibility
        if (!section.hasAttribute('tabindex')) {
          section.setAttribute('tabindex', '-1');
        }
        section.focus({ preventScroll: true });
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

      // Update aria-current for the link corresponding to the closest section
      if (visibleSections.size > 0) {
        const closestSection = Array.from(visibleSections.entries())
          .reduce((closest, current) => current[1] < closest[1] ? current : closest);
  
        // Remove aria-current from all links
        document.querySelectorAll('[data-month-link]').forEach(link => {
          link.removeAttribute('aria-current');
        });

        // Set aria-current for the closest section's link
        const month = closestSection[0].getAttribute('data-month');
        const link = document.querySelector(`[data-month-link="${month}"]`);
        if(link){
          link.setAttribute('aria-current', 'location');
        }
      } else {
        // When no dynamic section is visible, mark the Today link as active
        document.querySelectorAll('[data-month-link]').forEach(link => {
          link.removeAttribute('aria-current');
        });
        const todayLink = document.querySelector(`[data-month-link="today"]`);
        if (todayLink) {
          todayLink.setAttribute('aria-current', 'location');
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
  <nav aria-label="Months" class="month-nav pr-xl">
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

/* Update: Use aria-current attribute for active link styling */
.month-list a[aria-current="location"] {
  transition: all 0.2s ease;
  text-decoration: underline;
  color: var(--c-color-link);
}
</style>
