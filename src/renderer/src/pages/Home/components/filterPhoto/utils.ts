import * as levenshtein from 'fast-levenshtein'

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
    const regex = /(出 账 回 单|入 账 回 单)(.*?)(?=(?:出 账 回 单|入 账 回 单|$))/gs;
    const matches = [...text.matchAll(regex)];
    return matches.map(match => {
        const type = match[1].replace(/\s/g, '')
        const block = match[2].trim()
        const addr = extractPayer(block, type)
        const time = extractDate(block)
        const money = extractAmount(block)
        return {
            type,
            addr,
            time,
            money
        }
    });
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