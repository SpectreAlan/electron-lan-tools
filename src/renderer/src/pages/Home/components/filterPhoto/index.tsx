import './style.scss'
import {useState} from 'react'
import {Button, Form, message, Spin, Steps, Upload,  Col, Row, Statistic, Card} from 'antd'
import {PlusOutlined, SyncOutlined} from '@ant-design/icons'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import {calcScore, parseOCR} from './utils'

// @ts-ignore
dayjs.extend(customParseFormat);


export default () => {
    const [txtContext, setTxtContext] = useState<any>('')
    const [readLoading, setReadLoading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [xlsxContext, setXlsxContext] = useState<any[]>([])
    const [result, setResult] = useState<any>([])

    const onFinish = () => {
        if (!txtContext.length) {
            return message.error('TXT文件识别异常，请重新选择')
        }
        if (xlsxContext.length < 2) {
            return message.error('Excel文件读取异常，请重新选择')
        }
        if (loading) {
            return
        }
        setLoading(true)
        // 标准化 excel 数据
        for (let i = 1; i < xlsxContext.length; i++) {
            let {Btime, Cmoney} = xlsxContext[i]
            xlsxContext[i].time = dayjs(Btime, 'YYYY年M月D日').format('YYYY年MM月DD日')
            xlsxContext[i].money = ('' + Cmoney).replace(/[^\d.]/g, '')

        }
        const used: Set<any> = new Set()
        const ok: any[] = []
        const okIndex: any[] = []
        const no: any[] = []
        const xlsx: any[] = [...xlsxContext]
        for (let i = 1; i < xlsxContext.length; i++) {
            let {time, money, Daddr: addr} = xlsxContext[i]

            let best:any = null
            let bestScore: number = 0

            for (let j = 0; j < txtContext.length; j++) {
                if (used.has(j)) continue
                const item = txtContext[j]
                // 🚀 金额优先过滤（性能+准确率）
                if (item.money !== money) continue
                const score = calcScore(
                    {time, money, addr},
                    item
                )
                if (score > bestScore) {
                    bestScore = score
                    best = {...item, index: j}
                }
            }
            if (best && bestScore > 0.7) {
                used.add(best.index)
                ok.push(Object.values(xlsx[i]))
                okIndex.push(best.index)
            } else {
                no.push(Object.values(xlsx[i]))
            }
        }
        setResult([
            {label: '已匹配', value: ok.length, color: '#A0D911'},
            {label: '未匹配', value: no.length, color: '#ff4d4f'},
            {label: 'PDF发票数量', value: txtContext.length, color: '#1677ff'},
            {label: '表格行数', value: xlsxContext.length - 1, color: '#1677ff'},
        ])
        console.log(ok);
        console.log(okIndex);
        const title = Object.values(xlsxContext[0])
        // @ts-ignore
        window.electron.ocrEmptyPath()
        setTimeout(() => {
            // @ts-ignore
            window.electron.saveOcrExcel({tableData: [title, ...ok], title: '已匹配'})
            // @ts-ignore
            window.electron.saveOcrExcel({tableData: [title, ...no], title: '未匹配'})
            // @ts-ignore
            window.electron.imagesToPdf({files: okIndex})
            message.success('识别结果已保存到如下目录: 桌面/图文识别/识别结果')
            setLoading(false)
        }, 5000)
        return true
    }
    const beforeUpload = (file) => {
        setResult([])
        const reader = new FileReader()
        reader.onload = () => {
            setTxtContext(parseOCR(reader.result))
            message.success(file.name + ' 文件读取成功', 1)
        }
        reader.readAsText(file)
        return false
    }

    const beforeUploadXlsx = (file) => {
        setReadLoading(true)
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = e.target?.result
            if (data) {
                const wb = XLSX.read(data, {type: 'binary'})
                const ws = wb.Sheets[wb.SheetNames[0]]
                const json = XLSX.utils.sheet_to_json(ws, {
                    raw: false,
                    header: ['Aid', 'Btime', 'Cmoney', 'Daddr']
                })
                setXlsxContext(json)
            }
            setReadLoading(false)
            message.success(file.name + ' 文件读取成功', 1)
        }
        reader.readAsBinaryString(file)
        return false
    }
    return (
        <Spin spinning={loading}>
            <div className="ocr">
                <Form
                    onFinish={onFinish}
                    labelCol={{span: 10}}
                    wrapperCol={{span: 14}}
                    size={'large'}
                    colon={false}
                >
                    <Form.Item name="txt" label="图文识别TXT文件："
                               rules={[{required: true, message: '请上传图文识别TXT文件'}]}>
                        <Upload accept=".txt" beforeUpload={beforeUpload} maxCount={1}>
                            <button type="button">
                                <PlusOutlined/> 选择TXT
                            </button>
                        </Upload>
                    </Form.Item>

                    <Form.Item name="xlsx" label="待匹配表格："
                               rules={[{required: true, message: '请上传表格文件'}]}>
                        <Upload accept=".xlsx" beforeUpload={beforeUploadXlsx} maxCount={1}>
                            {readLoading ? <div><SyncOutlined spin/> Excel内容读取中，请稍候...</div> :
                                <button type="button">
                                    <PlusOutlined/> 选择XLSX
                                </button>}

                        </Upload>
                    </Form.Item>
                    <Form.Item label=" ">
                        <Button type="primary" htmlType="submit">
                            开始识别
                        </Button>
                    </Form.Item>
                </Form>
                <Row gutter={12}>
                    {
                        result.map(item=><Col span={6}>
                            <Card variant="borderless">
                                <Statistic
                                    title={item.label}
                                    value={item.value}
                                    valueStyle={{ color: item.color }}
                                />
                            </Card>
                        </Col>)
                    }
                </Row>
                <Steps
                    current={6}
                    items={[
                        {
                            title: '创建TXT',
                            description: '使用谷歌浏览器打开PDF文件；全选，复制，创建一个TXT文件，粘贴刚才复制的内容',
                        },
                        {
                            title: '切割PDF',
                            description: '使用PDFPatcher切割PDF保存：桌面/图文识别/images',
                        },
                        {
                            title: '结果识别',
                            description: '上传TXT和Excel，结果保存在：图文识别/识别结果',
                        },
                    ]}
                />
            </div>
        </Spin>
    )
}