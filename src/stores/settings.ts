import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { type Ref, ref } from 'vue'
import type MediaServer from '@/types/mediaServer'

export const useSettingsStore = defineStore('settings', () => {
    const komfUrl = useStorage('komf-url', 'http://localhost:8085')
    // komf 服务端访问密钥（KOMF_AUTH_KEY）：非本地/局域网来源的敏感操作需要；
    // 脚本通过 `Authorization: Bearer <base64(密钥)>` 头携带。
    const komfAuthKey = useStorage('komf-auth-key', '')
    const mediaServer: Ref<MediaServer | undefined> = ref()
    return { komfUrl, komfAuthKey, mediaServer }
})
