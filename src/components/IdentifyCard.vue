<template>
  <q-card v-ripple @click="onClick"
          :class="`${selected ? 'item-border' : '' } identify-card cursor-pointer q-hoverable`"
  >
    <span class="q-focus-helper"></span>

    <q-card-section horizontal class="card-border">
      <div class="full-width" style="padding: 0">
        <div class="identify-card-cover" style="position: relative">
          <q-img
            :src="item.imageUrl" ratio="0.7071"
            referrerpolicy="no-referrer"
          />
          <div v-if="item.language || item.mediaType"
               style="position: absolute; top: 4px; right: 4px; z-index: 2; display: flex; flex-direction: column; gap: 4px; align-items: flex-end">
            <span v-if="item.language"
                  style="background: rgba(0,0,0,0.72); color: #fff; font-size: 11px; line-height: 1; padding: 3px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px">
              {{ item.language }}
            </span>
            <span v-if="item.mediaType"
                  style="background: rgba(0,0,0,0.72); color: #fff; font-size: 11px; line-height: 1; padding: 3px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px">
              {{ item.mediaType }}
            </span>
          </div>
        </div>

        <q-card-section class="full-width">
          <div class="text-center ellipsis-2-lines" style="max-height:42px;height:42px">
            {{ item.title }}
            <q-tooltip :delay="500">{{ item.title }}</q-tooltip>
          </div>

          <div class="text-center text-weight-bold ellipsis">
            <q-btn v-if="sourceUrl" flat dense no-caps :href="sourceUrl" target="_blank" rel="noopener noreferrer" @click.stop>
              {{ providerName }}
            </q-btn>
            <span v-else>{{ providerName }}</span>
          </div>
        </q-card-section>
      </div>
    </q-card-section>

  </q-card>
</template>

<script setup lang="ts">
import type { SearchResult } from '@/types/metadata'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { getSourceUrl } from '@/providerLinks'

const emit = defineEmits(['on-select-result'])
const props = defineProps({
    item: {
        type: Object as PropType<SearchResult>,
        required: true
    },
    selected: {
        type: Boolean,
        required: true
    },
    width: {
        type: [String],
        required: false,
        default: '160px'
    }
})
const sourceUrl = computed(() => getSourceUrl(props.item.url))
const providerName = computed(() => {
    return props.item.provider.toLowerCase().split('_')
        .map(token => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
})

function onClick() {
    emit('on-select-result', props.item)
}
</script>

<style scoped lang="scss">
.identify-card {
  max-width: v-bind(width);
  width: v-bind(width);
  border: 3px solid transparent;
}

.identify-card:hover {
  border: 3px solid $highlight;
}

.item-border {
  border: 3px solid $highlight;
}
</style>
