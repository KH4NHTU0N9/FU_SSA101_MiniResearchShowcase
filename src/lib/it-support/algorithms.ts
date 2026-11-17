export interface AlgorithmFrame {
    type: string;
    indices?: number[];
    arr?: number[];
    msg?: string;
    index?: number;
    range?: number[];
}

export function generateBubbleSortFrames(arr: number[]): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    const tempArr = [...arr];
    for (let i = 0; i < tempArr.length; i++) {
        for (let j = 0; j < tempArr.length - i - 1; j++) {
            frames.push({
                type: "compare",
                indices: [j, j + 1],
                arr: [...tempArr],
                msg: `So sánh A[${j}]=${tempArr[j]} và A[${j + 1}]=${tempArr[j + 1]}`,
            });
            if (tempArr[j] > tempArr[j + 1]) {
                const temp = tempArr[j];
                tempArr[j] = tempArr[j + 1];
                tempArr[j + 1] = temp;
                frames.push({
                    type: "swap",
                    indices: [j, j + 1],
                    arr: [...tempArr],
                    msg: `Hoán đổi! Vì ${temp} > ${tempArr[j]}`,
                });
            }
        }
        frames.push({
            type: "sorted",
            index: tempArr.length - 1 - i,
            msg: "Phần tử lớn nhất đoạn hiện tại đã nổi lên cuối mảng.",
        });
    }
    frames.push({ type: "all_sorted", arr: [...tempArr], msg: "Hoàn tất sắp xếp nổi bọt!" });
    return frames;
}

export function generateSelectionSortFrames(arr: number[]): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    const tempArr = [...arr];
    for (let i = 0; i < tempArr.length; i++) {
        let minIdx = i;
        for (let j = i + 1; j < tempArr.length; j++) {
            frames.push({
                type: "compare",
                indices: [minIdx, j],
                arr: [...tempArr],
                msg: `Tìm Min: So sánh A[${j}]=${tempArr[j]} với Min hiện tại (${tempArr[minIdx]})`,
            });
            if (tempArr[j] < tempArr[minIdx]) {
                minIdx = j;
                frames.push({
                    type: "new_min",
                    indices: [minIdx],
                    arr: [...tempArr],
                    msg: `Cập nhật Min mới tại chỉ số ${minIdx} (Giá trị: ${tempArr[minIdx]})`,
                });
            }
        }
        if (minIdx !== i) {
            const temp = tempArr[i];
            tempArr[i] = tempArr[minIdx];
            tempArr[minIdx] = temp;
            frames.push({
                type: "swap",
                indices: [i, minIdx],
                arr: [...tempArr],
                msg: `Hoán đổi Min (${tempArr[i]}) về đầu đoạn chưa sắp xếp (vị trí ${i})`,
            });
        }
        frames.push({
            type: "sorted",
            index: i,
            msg: `Vị trí ${i} đã được sắp xếp chuẩn xác.`,
        });
    }
    frames.push({ type: "all_sorted", arr: [...tempArr], msg: "Hoàn tất sắp xếp chọn!" });
    return frames;
}

export function generateInsertionSortFrames(arr: number[]): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    const tempArr = [...arr];
    if (tempArr.length === 0) {
        frames.push({ type: "all_sorted", arr: [], msg: "Mảng rỗng." });
        return frames;
    }

    frames.push({
        type: "sorted",
        index: 0,
        msg: "Giả sử phần tử đầu tiên đã được sắp xếp.",
    });
    for (let i = 1; i < tempArr.length; i++) {
        const key = tempArr[i];
        let j = i - 1;
        frames.push({
            type: "compare",
            indices: [j, i],
            arr: [...tempArr],
            msg: `Lấy A[${i}]=${key} làm Khóa (Key) để chèn.`,
        });
        while (j >= 0 && tempArr[j] > key) {
            frames.push({
                type: "compare",
                indices: [j, j + 1],
                arr: [...tempArr],
                msg: `Vì A[${j}]=${tempArr[j]} > Khóa (${key}), dịch nó sang phải.`,
            });
            tempArr[j + 1] = tempArr[j];
            frames.push({
                type: "swap",
                indices: [j, j + 1],
                arr: [...tempArr],
                msg: `Đã dịch A[${j}] sang A[${j + 1}].`,
            });
            j = j - 1;
        }
        tempArr[j + 1] = key;
        frames.push({
            type: "mark_sorted_up_to",
            index: i,
            arr: [...tempArr],
            msg: `Chèn Khóa (${key}) vào vị trí ${j + 1}. Đoạn 0..${i} đã sắp xếp.`,
        });
    }
    frames.push({ type: "all_sorted", arr: [...tempArr], msg: "Hoàn tất sắp xếp chèn!" });
    return frames;
}

export function generateMergeSortFrames(arr: number[]): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    const tempArr = [...arr];
    if (tempArr.length <= 1) {
        frames.push({ type: "all_sorted", arr: [...tempArr], msg: "Mảng đã sắp xếp!" });
        return frames;
    }

    const merge = (l: number, m: number, r: number) => {
        const n1 = m - l + 1;
        const n2 = r - m;
        const L = new Array<number>(n1);
        const R = new Array<number>(n2);
        for (let i = 0; i < n1; i++) L[i] = tempArr[l + i];
        for (let j = 0; j < n2; j++) R[j] = tempArr[m + 1 + j];

        let i = 0;
        let j = 0;
        let k = l;
        frames.push({ type: "info", msg: `Trộn 2 mảng con: [${l}..${m}] và [${m + 1}..${r}]` });

        while (i < n1 && j < n2) {
            frames.push({
                type: "compare",
                indices: [l + i, m + 1 + j],
                arr: [...tempArr],
                msg: `So sánh L[${i}]=${L[i]} và R[${j}]=${R[j]}`,
            });
            if (L[i] <= R[j]) {
                tempArr[k] = L[i];
                i++;
            } else {
                tempArr[k] = R[j];
                j++;
            }
            frames.push({
                type: "overwrite",
                indices: [k],
                arr: [...tempArr],
                msg: `Ghi đè giá trị nhỏ hơn (${tempArr[k]}) vào vị trí ${k}`,
            });
            k++;
        }
        while (i < n1) {
            tempArr[k] = L[i];
            frames.push({
                type: "overwrite",
                indices: [k],
                arr: [...tempArr],
                msg: `Đưa phần tử còn lại của mảng Trái vào vị trí ${k}`,
            });
            i++;
            k++;
        }
        while (j < n2) {
            tempArr[k] = R[j];
            frames.push({
                type: "overwrite",
                indices: [k],
                arr: [...tempArr],
                msg: `Đưa phần tử còn lại của mảng Phải vào vị trí ${k}`,
            });
            j++;
            k++;
        }
        if (l === 0 && r === arr.length - 1) {
            frames.push({
                type: "all_sorted",
                arr: [...tempArr],
                msg: "Quá trình gộp (Merge) hoàn tất toàn bộ mảng!",
            });
        }
    };

    const sort = (l: number, r: number) => {
        if (l >= r) return;
        const m = l + Math.floor((r - l) / 2);
        frames.push({ type: "info", msg: `Chia mảng từ ${l} đến ${r} tại Mid = ${m}` });
        sort(l, m);
        sort(m + 1, r);
        merge(l, m, r);
    };

    sort(0, tempArr.length - 1);
    return frames;
}

export function generateQuickSortFrames(arr: number[]): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    const tempArr = [...arr];

    const partition = (low: number, high: number) => {
        const pivot = tempArr[high];
        frames.push({
            type: "info",
            indices: [high],
            msg: `Chọn Pivot = ${pivot} (Phần tử cuối đoạn [${low}..${high}])`,
        });
        let i = low - 1;
        for (let j = low; j <= high - 1; j++) {
            frames.push({
                type: "compare",
                indices: [j, high],
                arr: [...tempArr],
                msg: `So sánh A[${j}]=${tempArr[j]} với Pivot (${pivot})`,
            });
            if (tempArr[j] < pivot) {
                i++;
                const temp = tempArr[i];
                tempArr[i] = tempArr[j];
                tempArr[j] = temp;
                frames.push({
                    type: "swap",
                    indices: [i, j],
                    arr: [...tempArr],
                    msg: `Vì ${tempArr[i]} < Pivot, hoán đổi với vị trí ranh giới (${i})`,
                });
            }
        }
        const temp = tempArr[i + 1];
        tempArr[i + 1] = tempArr[high];
        tempArr[high] = temp;
        frames.push({
            type: "swap",
            indices: [i + 1, high],
            arr: [...tempArr],
            msg: `Đặt Pivot (${pivot}) vào vị trí chuẩn xác là ${i + 1}`,
        });
        frames.push({
            type: "sorted",
            index: i + 1,
            msg: "Pivot đã nằm đúng vị trí. Sẵn sàng chia đôi mảng tại đây.",
        });
        return i + 1;
    };

    const sort = (low: number, high: number) => {
        if (low < high) {
            const pi = partition(low, high);
            sort(low, pi - 1);
            sort(pi + 1, high);
        } else if (low === high) {
            frames.push({
                type: "sorted",
                index: low,
                msg: "Đoạn chỉ có 1 phần tử đã tự sắp xếp.",
            });
        }
    };

    sort(0, tempArr.length - 1);
    frames.push({ type: "all_sorted", arr: [...tempArr], msg: "Hoàn tất Quicksort!" });
    return frames;
}

export function generateLinearSearchFrames(arr: number[], target: number): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    for (let i = 0; i < arr.length; i++) {
        frames.push({
            type: "compare",
            indices: [i],
            arr: [...arr],
            msg: `Lần lặp ${i}: So sánh A[${i}] = ${arr[i]} với Target = ${target}`,
        });
        if (arr[i] === target) {
            frames.push({
                type: "found",
                indices: [i],
                msg: `Thành công! Tìm thấy ${target} tại vị trí chỉ số ${i}.`,
            });
            return frames;
        }
    }
    frames.push({
        type: "not_found",
        msg: `Đã duyệt hết mảng. Không tìm thấy ${target} trong bộ nhớ.`,
    });
    return frames;
}

export function generateBinarySearchFrames(arr: number[], target: number): AlgorithmFrame[] {
    const frames: AlgorithmFrame[] = [];
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        frames.push({
            type: "range",
            range: [left, right],
            indices: [mid],
            arr: [...arr],
            msg: `Khoảng: [${left}..${right}]. Lấy Mid = ${mid}. So sánh A[${mid}] = ${arr[mid]} với Target = ${target}`,
        });

        if (arr[mid] === target) {
            frames.push({
                type: "found",
                indices: [mid],
                msg: `Tuyệt vời! A[${mid}] == ${target}. Tìm kiếm nhị phân thành công.`,
            });
            return frames;
        }

        if (arr[mid] < target) {
            frames.push({
                type: "info",
                range: [left, right],
                msg: `Vì ${arr[mid]} < ${target}, loại bỏ nửa Trái. Cập nhật Left = Mid + 1 = ${mid + 1}`,
            });
            left = mid + 1;
        } else {
            frames.push({
                type: "info",
                range: [left, right],
                msg: `Vì ${arr[mid]} > ${target}, loại bỏ nửa Phải. Cập nhật Right = Mid - 1 = ${mid - 1}`,
            });
            right = mid - 1;
        }
    }
    frames.push({
        type: "not_found",
        msg: `Khoảng tìm kiếm đã thu hẹp về rỗng (Left > Right). Không tìm thấy ${target}.`,
    });
    return frames;
}
