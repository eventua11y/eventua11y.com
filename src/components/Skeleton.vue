<template>
    <div class="skeleton-paragraphs">
        <sl-skeleton effect="sheen"></sl-skeleton>
        <sl-skeleton effect="sheen"></sl-skeleton>
        <sl-skeleton effect="sheen"></sl-skeleton>
        <sl-skeleton effect="sheen"></sl-skeleton>
    </div>
</template>

<style>
.skeleton-paragraphs sl-skeleton {
    margin-bottom: 1rem;
}

.skeleton-paragraphs sl-skeleton:nth-child(2) {
    width: 95%;
}

.skeleton-paragraphs sl-skeleton:nth-child(4) {
    width: 90%;
}

.skeleton-paragraphs sl-skeleton:last-child {
    width: 50%;
}
</style>