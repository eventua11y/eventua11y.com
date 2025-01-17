<template>
  <div class="debug-container">
    <h2>Debug Component</h2>
    <p>SSR Random Number: {{ ssrNumber }}</p>
    <p>Count: {{ count }}</p>
    <button 
      type="button"
      @click="increment"
      role="button"
      aria-label="Increment counter"
    >Increment</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'Debug',
  props: {
    ssrNumber: {
      type: Number,
      required: true
    }
  },
  setup() {
    const count = ref(0)

    const increment = () => {
      console.log('Button clicked!')
      count.value++
      console.log('New count:', count.value)
    }

    return {
      count,
      increment
    }
  }
})
</script>

<style scoped>
.debug-container {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
</style>
