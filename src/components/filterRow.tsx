import { Radio } from 'antd';
import type { RadioChangeEvent } from 'antd/es/radio';
import appModel, { filters } from '@/store/app';
import { useModel,reactiveMemo } from '@enforcer-squad/rex';

const FilterRow = () => {
  console.log('FilterRow render');
  const { filter, toggleFilter } = useModel(appModel);

  const changeHandler = (e: RadioChangeEvent) => {
    const ret = e.target.value;
    toggleFilter(ret);
  };

  return (
    <div>
      <Radio.Group onChange={changeHandler} value={filter}>
        {filters.map(filter => (
          <Radio key={filter} value={filter}>
            {filter}
          </Radio>
        ))}
      </Radio.Group>
    </div>
  );
};

export default reactiveMemo(FilterRow);
