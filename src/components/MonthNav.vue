<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface MonthLink {
  text: string;
  identifier: string;
  href: string;
  sectionEl?: Element;
}

const props = withDefaults(
  defineProps<{
    contentRegion: string;
    showTodayLink?: boolean;
  }>(),
  {
    showTodayLink: false,
  }
);

const monthLinks = ref<MonthLink[]>([]);
const activeLink = ref('today');
let observer: IntersectionObserver | null = null;

/**
 * Scrolls smoothly to the target section and sets focus
 * @param {HTMLElement} target - The target element to scroll to
 */
function scrollToSection(target: Element | null) {
  if (target) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      target.scrollIntoView();
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Updates the month navigation links based on the current sections
 */
function updateMonthNav() {
  const tempLinks: MonthLink[] = [];
  // Conditionally add "Today" link
  if (props.showTodayLink) {
    tempLinks.push({
      text: 'Today',
      identifier: 'today',
      href: '#today',
    });
  }
  const monthSections = document.querySelectorAll('[data-month]');
  monthSections.forEach((section) => {
    const yearMonth = section.getAttribute('data-month');
    if (!yearMonth) return;
    const [yearStr, monthStr] = yearMonth.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1);
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

/**
 * Handles click events on navigation links
 * @param {Event} e - The click event
 * @param {Object} link - The link object containing identifier and section element
 */
function handleLinkClick(e: MouseEvent, link: MonthLink) {
  e.preventDefault();
  if (link.identifier === 'today') {
    const todaySection = document.getElementById('today');
    scrollToSection(todaySection);
  } else {
    scrollToSection(link.sectionEl);
  }
}

/**
 * Sets up IntersectionObserver to track month headings in viewport
 * Updates active state of month navigation links
 */
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

  /**
   * MutationObserver that watches for changes in the content region
   * When content changes (e.g. new events loaded):
   * - Updates month navigation links
   * - Resets intersection observer
   */
  const contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        updateMonthNav();
        setupIntersectionObserver();
        break;
      }
    }
  });

  // Watch content region for DOM changes
  const contentEl = document.querySelector(props.contentRegion);
  if (contentEl) {
    contentObserver.observe(contentEl, {
      childList: true,
      subtree: true,
    });
  }
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
  margin-top: var(--p-space-xl);
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
