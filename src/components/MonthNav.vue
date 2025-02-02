<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  contentRegion: { type: String, required: true },
});

const monthLinks = ref([]);
const activeLink = ref('today');
let observer; // declare mutable observer

function scrollToSection(target) {
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateMonthNav() {
  const tempLinks = [];
  // Add "Today" link
  tempLinks.push({
    text: 'Today',
    identifier: 'today',
    href: '#today',
  });
  const monthSections = document.querySelectorAll('[data-month]');
  monthSections.forEach((section) => {
    const yearMonth = section.getAttribute('data-month');
    const [year, month] = yearMonth.split('-');
    const date = new Date(year, month - 1);
    const formatter = new Intl.DateTimeFormat('default', {
      month: 'long',
      year:
        date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
    tempLinks.push({
      text: formatter.format(date),
      identifier: yearMonth,
      href: `#section-${yearMonth}`,
      sectionEl: section,
    });
  });
  monthLinks.value = tempLinks;
}

function handleLinkClick(e, link) {
  e.preventDefault();
  if (link.identifier === 'today') {
    const todaySection = document.getElementById('today');
    scrollToSection(todaySection);
  } else {
    scrollToSection(link.sectionEl);
  }
}

function setupIntersectionObserver() {
  // Disconnect previous observer if exists
  if (observer) observer.disconnect();

  const monthSections = document.querySelectorAll('[data-month]');
  const visibleSections = new Map();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const distance = Math.abs(
            entry.target.getBoundingClientRect().top - 100
          );
          visibleSections.set(entry.target, distance);
        } else {
          visibleSections.delete(entry.target);
        }
      });
      if (visibleSections.size > 0) {
        const [closestSection] = Array.from(visibleSections.entries()).reduce(
          (a, b) => (a[1] < b[1] ? a : b)
        );
        activeLink.value = closestSection.getAttribute('data-month');
      } else {
        activeLink.value = 'today';
      }
    },
    {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      rootMargin: '-100px 0px -50% 0px',
    }
  );

  monthSections.forEach((section) => observer.observe(section));
}

onMounted(() => {
  updateMonthNav();
  setupIntersectionObserver();

  const contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        updateMonthNav();
        setupIntersectionObserver();
        break;
      }
    }
  });
  contentObserver.observe(document.querySelector(props.contentRegion), {
    childList: true,
    subtree: true,
  });
});
</script>

<template>
  <nav aria-label="Months" class="month-nav pr-xl">
    <ul role="list" class="month-list">
      <li v-for="link in monthLinks" :key="link.identifier" class="mb-xs">
        <a
          :href="link.href"
          :data-month-link="link.identifier"
          :aria-current="activeLink === link.identifier ? 'location' : null"
          @click="(e) => handleLinkClick(e, link)"
        >
          {{ link.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<style>
.month-nav {
  border-left: 1px solid var(--s-color-border);
  font-size: var(--p-step--1);
  padding-left: var(--p-space-xs);
  position: sticky;
  top: var(--p-space-3xl);
}

.month-list a {
  display: block;
  color: inherit;
  text-decoration: none;
  width: 100%;
  white-space: nowrap;
}

.month-list a:hover {
  text-decoration: underline;
}

.month-list a[aria-current='location'] {
  transition: all 0.2s ease;
  text-decoration: underline;
  color: var(--c-color-link);
}
</style>
