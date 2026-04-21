import * as levenshtein from 'fast-levenshtein'

export function sliceText(arr) {
    arr.map(item => {
        if (typeof item.data === 'string') {
            const match = item.data.match(/.*[（(]([^）)]+)[）)]$/);
            if (match) {
                item.mark = match[1];
            }
        }
    })
    // @ts-ignore
    window.loading = false
}

const patterns0 = [
    // ✅ 完整停止词版本（推荐）
    /付款人[:：]\s*([\s\S]*?)(?=付款账号|付款开户行|收款人|收款账号|交易金额|开户行|$)/,

    // ✅ 兜底
    /付款人[:：]\s*([^\n\r]+)/
]

const patterns1 = [
    // ✅ 完整停止词版本（推荐）
    /收款人[:：]\s*([\s\S]*?)(?=收款账号|付款开户行|收款人|收款账号|交易金额|开户行|$)/,

    // ✅ 兜底
    /收款人[:：]\s*([^\n\r]+)/
]

function extractPayer(block, type) {
   const pattern = type === '入账回单' ? patterns0 : patterns1

    for (const reg of pattern) {
        const m = block.match(reg)
        if (m && m[1]) {
            return cleanName(m[1])
        }
    }

    return ''
}

function extractDate(block) {
    const m = block.match(/交易日期[:：]\s*(\d{4}年\d{1,2}月\d{1,2}日)/)
    const res = m ? m[1] : ''
    return res
}

function extractAmount(block) {
    const m = block.match(/CNY\s*([\d,\.]+)/) || block.match(/￥\s*([\d,\.]+)/)
    const res = m ? m[1].replace(/[^\d.]/g, '') : ''
    return res
}

function cleanName(name = '') {
    return name
        .replace(/收款人.*$/, '')      // 防止串行
        .replace(/专用章.*$/, '')      // 去章
        .replace(/[^\u4e00-\u9fa5（）()]/g, '')
        .replace(/有限公同/g, '有限公司')
        .replace(/股司/g, '公司')
        .replace(/有$/, '有限公司')
        .replace(/限$/, '有限公司')
}

export function parseOCR(text) {
    const regex = /([A-Z0-9]{8})\s*\n?(出\s*账\s*回\s*单|入\s*账\s*回\s*单)[\s\S]*?(?=([A-Z0-9]{8})\s*\n?(出\s*账\s*回\s*单|入\s*账\s*回\s*单)|$)/g

    const result:any[] = []
    let match

    while ((match = regex.exec(text)) !== null) {


        // ✅ type 去所有空格
        const type = match[2].replace(/\s+/g, '')

        const block = match[0]
        const addr = extractPayer(block, type)
        const time = extractDate(block)
        const money = extractAmount(block)
        result.push({
            type,
            addr,
            time,
            money
        })
    }
    return result
}

export function isSimilar(a, b, threshold = 0.8) {
    if (!b || !b) return false
    const distance = levenshtein.get(a, b)
    const similarity = 1 - distance / Math.max(a.length, b.length)
    return similarity >= threshold
}
export function calcScore(a, b) {
    let score = 0

    // 金额（最重要）
    if (a.money === b.money) score += 0.5

    // 日期
    if (a.time === b.time) score += 0.3

    // 名称
    if (b.addr) {
        const dist = levenshtein.get(a.addr || '', b.addr)
        const sim = 1 - dist / Math.max((a.addr || '').length, b.addr.length)
        score += sim * 0.2
    }

    return score
}