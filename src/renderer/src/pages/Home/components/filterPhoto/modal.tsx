import React from 'react';
import { MinusCircleOutlined, PlusOutlined, ExclamationCircleFilled  } from '@ant-design/icons';
import { Button, Form, Input, Modal } from 'antd';
import {getDefaultCache, setDefaultCache} from './utils'

const App: any = (props: any) => {
    const [form] = Form.useForm();
    const {toggleModal, handleOk, modal} = props
    const onSave = async () => {
        try {
            const values = await form.validateFields();
            const list = values.names || [];
            setDefaultCache(list);
            handleOk(list);
        } catch (err) {
            console.error('校验失败:', err);
        }
    };

    React.useEffect(() => {
        if (modal) {
            const list =getDefaultCache()
            form.setFieldsValue({
                names: list
            });
        }
    }, [modal]);

    const reset = ()=>{
        Modal.confirm({
            title: '温馨提示',
            icon: <ExclamationCircleFilled />,
            content: '确定要重置吗？',
            onOk() {
                setDefaultCache()
                handleOk(getDefaultCache());
            },
            onCancel() {
                console.log('Cancel');
            },
        });
    }

    return (
        <Modal
            title="回单切割关键字配置"
            closable={{ 'aria-label': 'Custom Close Button' }}
            open={modal}
            onCancel={toggleModal}
            footer={[
                <Button key="reset" onClick={reset}>重置</Button>,
                <Button key="back" onClick={toggleModal}>取消</Button>,
                <Button key="submit" type="primary" onClick={onSave}>保存</Button>
            ]}
        >
            <Form
                form={form}
                name="dynamic_form_item"
                style={{ maxWidth: 600 }}
            >
                <Form.List
                    name="names"
                    rules={[
                        {
                            validator: async (_, names) => {
                                if (!names || names.length < 2) {
                                    return Promise.reject(new Error('At least 2 passengers'));
                                }
                            },
                        },
                    ]}
                >
                    {(fields, { add, remove }, { errors }) => (
                        <>{fields.map(({ key, name, ...restField }) => (
                            <Form.Item key={key}>
                                <Form.Item
                                    {...restField}
                                    name={name}
                                    validateTrigger={['onChange', 'onBlur']}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: "请输入关键词或删除该行",
                                        },
                                    ]}
                                    noStyle
                                >
                                    <Input style={{ width: '60%' }} />
                                </Form.Item>

                                <MinusCircleOutlined onClick={() => remove(name)} />
                            </Form.Item>
                        ))}
                            <Form.Item>
                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    style={{ width: '60%' }}
                                    icon={<PlusOutlined />}
                                >
                                   新增关键词
                                </Button>
                                <Form.ErrorList errors={errors} />
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </Form>
        </Modal>
    );
};

export default App;