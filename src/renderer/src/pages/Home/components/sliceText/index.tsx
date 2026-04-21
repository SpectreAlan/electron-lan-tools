import { useState } from 'react'
import './style.scss'
import { Splitter } from 'antd'
import {  Upload, Table, Result, Empty } from 'antd'
import * as XLSX from 'xlsx'
import { sliceText } from './utils'
import { InboxOutlined } from '@ant-design/icons';

export default () => {
  const [tableData, setTableData] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [result, setResult] = useState({total: 0, selected: 0})
  const [loading, setLoading] = useState(false)
  const onFinish = (arr, columns) => {
    try{
      sliceText(arr)
    }
    catch (e) {
      setLoading(false)
      // @ts-ignore
      window.loading = false
    }
    const inter = setInterval(async ()=>{
      // @ts-ignore
      if(!window.loading){
        setLoading(false)
        setTableData(tableData=>{
          setResult({
            total: tableData.length,
            selected: tableData.filter((item:any)=>item.mark).length
          })
          console.log({tableData: [[columns?.[1]?.title || '原始数据', '筛选结果'],...tableData.map(item=>[item.data,item.mark])], title: '内容截取'});
          // @ts-ignore
          window.electron.saveExcel({tableData: [[columns?.[1]?.title || '原始数据', '筛选结果'],...tableData.map(item=>[item.data,item.mark])], title: '内容截取'})
          return tableData
        })
        clearInterval(inter)
      }
    }, 60)
  }

  const handleFileUpload = (file: any) => {
    setTableData([])
    setResult({total: 0, selected: 0})
    setLoading(true)
    // @ts-ignore
    window.loading = true
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (data) {
        const wb = XLSX.read(data, { type: 'binary' })
        // 获取 Excel 中的第一个工作表
        const ws = wb.Sheets[wb.SheetNames[0]]
        // 将工作表转换为 JSON 格式
        const jsonData:any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (jsonData.length > 0) {
          // 获取表头（第一行）
          const headers:any[] = jsonData[0]

          // 构建列配置
          const columns:any[] = headers.map((header: string, index: number) => ({
            title: header || `Column ${index + 1}`,
            dataIndex: 'data',
            key: 'data'
          }))
          columns.push({
            title: '匹配结果',
            dataIndex: 'mark',
            key: 'mark',
          })
          columns.unshift({
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            render: (_, record:any) => record.index
          })

          setColumns(columns)
          const arr:any[] = []
          jsonData.slice(1).map((item:any, i)=>{
            if(item[0]){
              arr.push({
                index: i + 1,
                key: i,
                data: item[0],
                mark: ''
              })
            }
          })
          setTableData(arr)
          setTimeout(()=>{
            onFinish(arr, columns)
          }, 60)
        }
      }
    }
    reader.readAsBinaryString(file)
    return false  // 阻止默认的上传行为
  }

  return <div className="excel">
    <Splitter style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel defaultSize="40%" min="40%" max="50%">
        <div className={'formBox'}>
          <h3>文件上传</h3>
          <Upload.Dragger
            maxCount={1}
            beforeUpload={handleFileUpload}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或者拖拽Excel文件到此区域上传</p>
            <p className="ant-upload-hint">
              默认读取表格的第一个sheet中的第一列数据<br/>筛选结果会自动保存到桌面
            </p>
          </Upload.Dragger>
          <Result
            status={loading ? 'warning' : (!result.total ? 'info':  'success')}
            title={loading ? '数据筛选中...' : (!result.total ? '等待上传':  '匹配完成')}
            subTitle={result.selected ? <div>
              <div>筛选结果已经保存到 <span className={'blue'}>桌面</span></div>
            </div> : !loading && !tableData.length ? '请先上传文件': (loading ? '数据匹配中...' : '未匹配到符合条件的数据')}
          />
        </div>
      </Splitter.Panel>
      <Splitter.Panel>
        <div className="tableBox">
          <h3>数据预览</h3>
          <div className="table">
            <Table
              locale={{emptyText: <Empty description={'请上传表格...'}/>}}
              bordered
              loading={loading}
              scroll={{ y: 445 }}
              dataSource={tableData}
              columns={columns}
              pagination={false}
              rowKey={(record:any) => record.index}
            />
          </div>
        </div>
      </Splitter.Panel>
    </Splitter>
  </div>
}
