import './style.scss'
import {useState} from 'react'
import {Button, Form, message, Spin, Steps, Upload, Col, Row, Statistic, Card, Input, Space} from 'antd'
import {PlusOutlined, SyncOutlined} from '@ant-design/icons'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import {calcScore, parseOCR} from './utils'
import Modal from './modal'
import {getDefaultCache} from './utils'

// @ts-ignore
dayjs.extend(customParseFormat);


export default () => {
    const [readLoading, setReadLoading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [modal, setModal] = useState(false)
    const [txtContext, setTxtContext] = useState<any[]>([])
    const [xlsxContext, setXlsxContext] = useState<any[]>([])
    const [result, setResult] = useState<any>([])
    const [fileList, setFileList] = useState<any[]>([])
    const [fileListTxt, setFileListTxt] = useState<any[]>([])
    const [config, setConfig] = useState<any[]>(getDefaultCache())
    const [form] = Form.useForm();

    const onFinish = async () => {
        if (!txtContext.length) {
            return message.error('PDF内容识别异常，请重新粘贴')
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

            let best: any = null
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
        const title = Object.values(xlsxContext[0])
        // @ts-ignore
        const clearRes = await window.electron.clearFolder('识别结果')
        if (!clearRes.success) {
            message.error(clearRes.error);
            setLoading(false)
            return
        }
        // @ts-ignore
        window.electron.saveOcrExcel({tableData: [title, ...ok], title: '已匹配'})
        // @ts-ignore
        window.electron.saveOcrExcel({tableData: [title, ...no], title: '未匹配'})
        // @ts-ignore
        const res = await window.electron.imagesToPdf({files: okIndex})
        if (res?.error) {
            message.error(res.error)
        } else {
            message.success('识别结果已保存到如下目录: 桌面/图文识别/识别结果')
        }
        setResult([
            {label: '已匹配', value: ok.length, color: '#A0D911'},
            {label: '未匹配', value: no.length, color: '#ff4d4f'},
            {label: 'PDF发票数量', value: txtContext.length, color: '#1677ff'},
            {label: '表格行数', value: xlsxContext.length - 1, color: '#1677ff'},
        ])
        setLoading(false)
        return true
    }

    const beforeUpload = async (file) => {
        // @ts-ignore
        const countRes = await window.electron.getImagesCount()
        if (!countRes.success) {
            setFileListTxt([])
            message.error(countRes.error, 1)
            return false
        }
        if (!countRes.count) {
            message.error('images目录为空，请先切割PDF', 1)
            setTimeout(() => {
                setFileListTxt([])
            }, 20)
            return false
        }
        setResult([])
        const reader = new FileReader()
        reader.onload = () => {
            const txt = parseOCR(reader.result, form.getFieldValue('types'))
            console.log(txt);
            if (countRes.count !== txt.length) {
                setFileListTxt([])
                message.error('图片数量与识别结果不匹配，请检查: 回单切割关键字', 5)
            } else {
                setTxtContext(txt)
                message.success(file.name + ' 文件读取成功', 1)
            }
        }
        reader.readAsText(file)
        return false
    }

    const clear = async () => {
        // @ts-ignore
        const res = await window.electron.clearFolder('images')
        if (res.success) {
            message.success('操作成功', 1)
        } else {
            message.error(res.error, 1)
        }
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
    const onReset = () => {
        form.resetFields();
        setFileList([])
        setFileListTxt([])
        setResult([])
        setXlsxContext([])
    };
    const handleOk = (list) => {
        toggleModal()
        setConfig(list)
        form.setFieldValue('types', list.join(' | '))
    }
    const toggleModal = () => {
        setModal(modal => !modal)
    }
    return (
        <Spin spinning={loading}>
            <div className="ocr">
                <Form
                    form={form}
                    onFinish={onFinish}
                    labelCol={{span: 10}}
                    wrapperCol={{span: 14}}
                    size={'large'}
                    colon={false}
                >
                    <Form.Item name="txt" label="图文识别TXT文件："
                               rules={[{required: true, message: '请上传图文识别TXT文件'}]}>
                        <Upload accept=".txt" beforeUpload={beforeUpload} maxCount={1} fileList={fileListTxt}
                                onChange={(e) => setFileListTxt(e.fileList)}>
                            <button type="button">
                                <PlusOutlined/> 选择TXT
                            </button>
                        </Upload>
                    </Form.Item>
                    <Form.Item
                        name="types"
                        label="回单切割关键字："
                        rules={[{required: true, message: '请输入回单切割关键字'}]}
                        initialValue={config.join(' | ')}
                    >
                        <Input.TextArea readOnly onClick={() => setModal(true)}/>
                    </Form.Item>
                    <Form.Item name="xlsx" label="待匹配表格："
                               rules={[{required: true, message: '请上传表格文件'}]}>
                        <Upload accept=".xlsx" beforeUpload={beforeUploadXlsx} maxCount={1} fileList={fileList}
                                onChange={(e) => setFileList(e.fileList)}>
                            {readLoading ? <div><SyncOutlined spin/> Excel内容读取中，请稍候...</div> :
                                <button type="button">
                                    <PlusOutlined/> 选择XLSX
                                </button>}

                        </Upload>
                    </Form.Item>
                    <Form.Item label=" ">
                        <Space>
                            <Button type="primary" htmlType="submit">开始识别</Button>
                            <Button htmlType="button" onClick={onReset}> 重置</Button>
                            <Button htmlType="button" onClick={clear}>清空images目录</Button>
                        </Space>
                    </Form.Item>
                </Form>
                <Row gutter={12}>
                    {
                        result.map(item => <Col span={6} key={item.label}>
                            <Card variant="borderless">
                                <Statistic
                                    title={item.label}
                                    value={item.value}
                                    valueStyle={{color: item.color}}
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
            <Modal toggleModal={toggleModal} handleOk={handleOk} modal={modal}/>
        </Spin>
    )
}