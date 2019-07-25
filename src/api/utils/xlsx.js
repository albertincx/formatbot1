const _ = require('lodash');
const xl = require('excel4node');

class Xlsx {
  constructor() {
    this.defaultFormat = {
      width: 15,
      style: {
        font: {
          size: 10,
        },
      },
    };
    this.headerFormat = {
      height: 30,
      style: {
        font: {
          size: 10,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
          vertical: 'center',
        },
      },
    };
  }

  xlx({
        items,
        columns,
        headers,
        formats = {},
        onError,
        keyCol = 'url',
        defaultFormat,
        headerFormat,
      }, filename = '') {
    if (!defaultFormat) {
      defaultFormat = this.defaultFormat;
    }
    if (!headerFormat) {
      headerFormat = this.headerFormat;
    }
    if (!columns) {
      columns = Object.keys(items[0]);
    }
    if (Array.isArray(columns)) {
      let columnsObj = {};
      columns.map((it, itindex) => columnsObj[it] = it);
      columns = columnsObj;
    }
    if (!headers) {
      headers = columns;
    }

    try {
      const wb = new xl.Workbook();
      const ws = wb.addWorksheet('Default', {});

      const _defaultFormat = (() => {
        let { style, fn = 'string' } = { ...defaultFormat };
        style = wb.createStyle(style || {});
        return {
          ...defaultFormat,
          style,
          fn,
        };
      })();
      const assignFormat = (o = {}) => {
        let { style, fn = _defaultFormat.fn } = { ...o };
        if (style) {
          style = wb.createStyle(style);
        } else {
          style = _defaultFormat.style;
        }
        return {
          ..._defaultFormat, ...o,
          style,
          fn,
        };
      };
      const _headerFormat = assignFormat(headerFormat);

      const colsArray = Object.keys(columns);

      const _formats = _.zipObject(colsArray,
          colsArray.map(col => assignFormat(formats[col] || {})));

      let i = 1;

      if (_headerFormat.height) {
        ws.row(i).height = _headerFormat.height;
      }
      for (let j = 1; j <= colsArray.length; j++) {
        const { fn, style, cast } = _headerFormat;
        const col = colsArray[j - 1];
        let value = headers[col];
        if (cast) {
          value = cast(value);
        }
        ws.cell(i, j)[fn](value).style(style);
        const { width } = _formats[col];
        if (width) {
          ws.column(j).width = width;
        }
      }

      i++;

      for (let ii = 0; ii < items.length; ii += 1) {
        let report = items[ii];
        if (typeof report === 'object' && report.toObject) {
          report = report.toObject;
        }
        if (report[keyCol] === 'N/A') continue;
        let max = 1;
        for (let j = colsArray.length; j > 0; j--) {
          const col = colsArray[j - 1];
          let values = _.get(report, col, '');
          values = `${values}`;
          if (col !== keyCol) {
            if (!Array.isArray(values)) {
              values = [values];
            }
            if (values.length > max) {
              max = values.length;
            }

            let __i = i;
            for (let value of values) {
              const { style, cast, fn } = _formats[col];
              let func = fn;
              if (cast) {
                value = cast(value);
              }
              if (value.match('http')) {
                func = 'link';
              }
              ws.cell(__i, j)[func](value).style(style);
              __i++;
            }
          }
        }

        const j = colsArray.indexOf(keyCol) + 1;
        if (j > 0) {
          const { fn, style, cast } = _formats[keyCol];
          let value = report[keyCol];
          if (cast) {
            value = cast(value);
          }
          ws.cell(i, j, i + max - 1, j)[fn](value).style(style);
        }

        i += max;
      }
      return filename ? wb.write(filename) : wb.writeToBuffer();

    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}

/**
 * @typedef stat
 */
module.exports = Xlsx;
