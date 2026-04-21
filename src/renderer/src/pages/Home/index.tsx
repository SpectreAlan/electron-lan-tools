import {Tabs} from 'antd'
import Excel from './components/excel'
import SliceText from './components/sliceText'
import FilterPhoto from './components/filterPhoto'
import './style.scss'

export default () => {
    return <div className={'home'}>
        <Tabs
            defaultActiveKey="0"
            items={[
                {
                    key: '0',
                    label: '图文识别',
                    children: <FilterPhoto/>
                },
                {
                    key: '1',
                    label: '数据凑零',
                    children: <Excel/>
                },
                {
                    key: '2',
                    label: '截取括号内容',
                    children: <SliceText/>
                }
            ]}
        />
    </div>
}
