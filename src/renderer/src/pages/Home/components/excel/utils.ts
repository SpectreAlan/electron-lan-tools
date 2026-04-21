export function get2(arr) {
  const pairs:any[] = []
  const used = new Set()

  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (i !== j && !used.has(`${j},${i}`)) {
        pairs.push([arr[i], arr[j]])
        used.add(`${i},${j}`)
      }
    }
  }
  let idx = 0
  pairs.map((item:any) => {
    if (Math.floor(item[0].data * 100) + Math.floor(item[1].data * 100) == 0) {
      idx += 1
      const key = '组合2-' + idx
      item[0].mark = key
      item[1].mark = key
    }
  })
  get3(arr)
}

function get3(objArray, dataKey = 'data', idKey = 'key') {
  // 1. 数据预处理
  const nums = objArray.filter(item=>!item.mark).map(item => ({
    id: item[idKey],
    value: item[dataKey]
  }))

  // 2. 按数值排序（保留原始对象信息）
  nums.sort((a, b) => a.value - b.value)

  const result:any[] = []
  const usedIds = new Set()

  let idx = 0

  // 3. 双指针扫描
  for (let i = 0; i < nums.length - 2; i++) {
    // 跳过已使用或重复的元素
    if (usedIds.has(nums[i].id)) {
      continue
    }

    if (i > 0 && nums[i].value === nums[i - 1].value) continue

    let left = i + 1
    let right = nums.length - 1

    while (left < right) {
      // 跳过已使用的元素
      while (left < right && usedIds.has(nums[left].id)) left++
      while (left < right && usedIds.has(nums[right].id)) right--
      if (left >= right) break

      const sum = nums[i].value + nums[left].value + nums[right].value

      if (sum == 0) {
        idx += 1
        const key = '组合3-' + idx
        objArray[nums[i].id].mark = key
        objArray[nums[left].id].mark = key
        objArray[nums[right].id].mark = key
        // 记录结果并标记已使用
        result.push([
          { [idKey]: nums[i].id, [dataKey]: nums[i].value },
          { [idKey]: nums[left].id, [dataKey]: nums[left].value },
          { [idKey]: nums[right].id, [dataKey]: nums[right].value }
        ])

        usedIds.add(nums[i].id)
          .add(nums[left].id)
          .add(nums[right].id)

        // 跳过重复值
        while (left < right && nums[left].value === nums[left + 1].value) left++
        while (left < right && nums[right].value === nums[right - 1].value) right--
        left++
        right--
      } else if (sum < 0) left++
      else right--
    }
  }
  get4(objArray)
}

function get4(objArray, dataKey = 'data', idKey = 'key') {
  // 1. 数据预处理
  const nums = objArray.filter(item=>!item.mark).map(item => ({
    id: item[idKey],
    value: item[dataKey],
    raw: item  // 保留原始对象引用
  }));

  // 2. 按数值排序
  nums.sort((a, b) => a.value - b.value);

  const result:any[] = [];
  const usedIds = new Set();
  const n = nums.length;
  let idx = 0

  // 3. 四指针法（固定两层循环+双指针）
  for (let i = 0; i < n - 3; i++) {
    // 跳过已使用或重复的元素
    if (usedIds.has(nums[i].id)) continue;
    if (i > 0 && nums[i].value === nums[i-1].value) continue;

    // 提前终止条件
    if (nums[i].value + nums[i+1].value + nums[i+2].value + nums[i+3].value > 0) break;
    if (nums[i].value + nums[n-3].value + nums[n-2].value + nums[n-1].value < 0) continue;

    for (let j = i + 1; j < n - 2; j++) {
      // 跳过已使用或重复的元素
      if (usedIds.has(nums[j].id)) continue;
      if (j > i + 1 && nums[j].value === nums[j-1].value) continue;

      let left = j + 1;
      let right = n - 1;

      while (left < right) {
        // 跳过已使用的元素
        while (left < right && usedIds.has(nums[left].id)) left++;
        while (left < right && usedIds.has(nums[right].id)) right--;
        if (left >= right) break;

        const sum = nums[i].value + nums[j].value + nums[left].value + nums[right].value;
        if (Math.abs(sum) == 0) {  // 处理浮点精度
          idx += 1
          const key = '组合4-' + idx
          objArray[nums[i].id].mark = key
          objArray[nums[j].id].mark = key
          objArray[nums[left].id].mark = key
          objArray[nums[right].id].mark = key
          // 记录结果
          result.push([
            nums[i].raw,
            nums[j].raw,
            nums[left].raw,
            nums[right].raw
          ]);

          // 标记已使用
          usedIds.add(nums[i].id)
            .add(nums[j].id)
            .add(nums[left].id)
            .add(nums[right].id);

          // 跳过重复值
          while (left < right && nums[left].value === nums[left+1].value) left++;
          while (left < right && nums[right].value === nums[right-1].value) right--;
          left++;
          right--;
        }
        else if (sum < 0) left++;
        else right--;
      }
    }
  }

  get5(objArray)
}

function get5(objArray, dataKey = 'data', idKey = 'key') {
  // 1. 数据预处理
  const nums = objArray.filter(item=>!item.mark).map(item => ({
    id: item[idKey],
    value: item[dataKey],
    raw: item
  })).sort((a, b) => a.value - b.value);

  const result:any[] = [];
  const usedIds = new Set();
  const n = nums.length;
  let idx = 0

  // 2. 五层扫描（三层固定+双指针）
  for (let i = 0; i < n - 4; i++) {
    if (usedIds.has(nums[i].id)) continue;
    if (i > 0 && nums[i].value === nums[i-1].value) continue;

    // 第一层终止条件
    if (nums[i].value + nums[i+1].value + nums[i+2].value + nums[i+3].value + nums[i+4].value > 0) break;
    if (nums[i].value + nums[n-4].value + nums[n-3].value + nums[n-2].value + nums[n-1].value < 0) continue;

    for (let j = i + 1; j < n - 3; j++) {
      if (usedIds.has(nums[j].id)) continue;
      if (j > i + 1 && nums[j].value === nums[j-1].value) continue;

      // 第二层终止条件
      const twoSum = nums[i].value + nums[j].value;
      if (twoSum + nums[j+1].value + nums[j+2].value + nums[j+3].value > 0) break;
      if (twoSum + nums[n-3].value + nums[n-2].value + nums[n-1].value < 0) continue;

      for (let k = j + 1; k < n - 2; k++) {
        if (usedIds.has(nums[k].id)) continue;
        if (k > j + 1 && nums[k].value === nums[k-1].value) continue;

        // 双指针找最后两个数
        let left = k + 1, right = n - 1;

        while (left < right) {
          // 跳过已使用的元素
          while (left < right && usedIds.has(nums[left].id)) left++;
          while (left < right && usedIds.has(nums[right].id)) right--;
          if (left >= right) break;

          const sum = nums[i].value + nums[j].value + nums[k].value + nums[left].value + nums[right].value;

          if (Math.abs(sum) == 0 && !(objArray[nums[i].id].mark || objArray[nums[j].id].mark ||  objArray[nums[k].id].mark || objArray[nums[left].id].mark || objArray[nums[right].id].mark)) {
            idx += 1
            const key = '组合5-' + idx
            objArray[nums[i].id].mark = key
            objArray[nums[j].id].mark = key
            objArray[nums[k].id].mark = key
            objArray[nums[left].id].mark = key
            objArray[nums[right].id].mark = key
            result.push([
              nums[i].raw,
              nums[j].raw,
              nums[k].raw,
              nums[left].raw,
              nums[right].raw
            ]);

            // 标记已使用
            [i, j, k, left, right].forEach(idx => usedIds.add(nums[idx].id));

            // 跳过重复值
            while (left < right && nums[left].value === nums[left+1].value) left++;
            while (left < right && nums[right].value === nums[right-1].value) right--;
            left++;
            right--;
          }
          else if (sum < 0) left++;
          else right--;
        }
      }
    }
  }
  get6(objArray)
}

function get6(objArray,  dataKey = 'data', idKey = 'key') {
  // 阶段1：数据预处理
  const nums = objArray.filter(item=>!item.mark).map(item => ({
    id: item[idKey],
    value: parseFloat(item[dataKey]) || 0,
    raw: item
  })).filter(item => !isNaN(item.value));

  nums.sort((a, b) => a.value - b.value);
  const n = nums.length;
  const result :any[]= [];
  const usedIds = new Set();
  let idx = 0

  // 阶段2：构建两数和的哈希表（值 -> [索引对]）
  const twoSumMap = new Map();
  for (let i = 0; i < n; i++) {
    if (usedIds.has(nums[i].id)) continue;
    for (let j = i + 1; j < n; j++) {
      if (usedIds.has(nums[j].id)) continue;
      const sum = nums[i].value + nums[j].value;
      const key = sum.toFixed(6); // 浮点数精度处理
      if (!twoSumMap.has(key)) twoSumMap.set(key, []);
      twoSumMap.get(key).push([i, j]);
    }
  }

  // 阶段3：四数查找（双循环+哈希查找）
  for (let a = 0; a < n; a++) {
    if (usedIds.has(nums[a].id)) continue;
    if (a > 0 && nums[a].value === nums[a-1].value) continue;

    for (let b = a + 1; b < n; b++) {
      if (usedIds.has(nums[b].id)) continue;
      if (b > a + 1 && nums[b].value === nums[b-1].value) continue;

      for (let c = b + 1; c < n; c++) {
        if (usedIds.has(nums[c].id)) continue;
        if (c > b + 1 && nums[c].value === nums[c-1].value) continue;

        const target = -(nums[a].value + nums[b].value + nums[c].value);
        const targetKey = target.toFixed(6);

        if (twoSumMap.has(targetKey)) {
          for (const [d, e] of twoSumMap.get(targetKey)) {
            // 检查所有索引是否唯一且未被使用
            const indices = new Set([a, b, c, d, e]);
            if (indices.size === 5 &&
              !usedIds.has(nums[d].id) &&
              !usedIds.has(nums[e].id)) {

              // 找第六个数（可能存在于原始数组）
              const currentSum = nums[a].value + nums[b].value +
                nums[c].value + nums[d].value +
                nums[e].value;
              const sixthValue = -currentSum;

              // 二分查找第六个数
              let left = 0, right = n - 1;
              while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (Math.abs(nums[mid].value - sixthValue) < 1e-6) {
                  if (!usedIds.has(nums[mid].id) && !indices.has(mid)) {
                    // 找到有效组合
                    result.push([
                      nums[a].raw,
                      nums[b].raw,
                      nums[c].raw,
                      nums[d].raw,
                      nums[e].raw,
                      nums[mid].raw
                    ]);
                    idx += 1
                    const key = '组合6-' + idx
                    objArray[nums[a].id].mark = key
                    objArray[nums[b].id].mark = key
                    objArray[nums[c].id].mark = key
                    objArray[nums[d].id].mark = key
                    objArray[nums[e].id].mark = key
                    objArray[nums[mid].id].mark = key

                    // 标记所有元素为已使用
                      // @ts-ignore
                    [a, b, c, d, e, mid].forEach(idx => usedIds.add(nums[idx].id));
                    break;
                  }
                }
                if (nums[mid].value < sixthValue) left = mid + 1;
                else right = mid - 1;
              }
            }
          }
        }
      }
    }
  }
  // @ts-ignore
  window.loading = false
}
