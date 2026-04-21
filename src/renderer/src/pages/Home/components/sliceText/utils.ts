export function sliceText(arr) {
  arr.map(item=>{
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