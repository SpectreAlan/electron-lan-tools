import {Tabs} from 'antd'
import Excel from './components/excel'
import SliceText from './components/sliceText'
import FilterPhoto from './components/filterPhoto'
import './style.scss'

export default () => {
    return <div className={'home'}>
        <Tabs
            defaultActiveKey="2"
            items={[
                {
                    key: '0',
                    label: '数据凑零',
                    children: <Excel/>
                },
                {
                    key: '1',
                    label: '截取括号内容',
                    children: <SliceText/>
                },
                {
                    key: '2',
                    label: '照片提取',
                    children: <FilterPhoto/>
                }
            ]}
        />
    </div>
}
