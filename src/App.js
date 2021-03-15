import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';

const App = () => {

  const [allRows, setAllRows] = useState([]);

  //date null so that it can show default text
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  //results
  const [bullish, setBullish] = useState(0);

  //pre-calculated lists
  const [volumeAndChange, setVolumeAndChange] = useState([]);
  const [smallestMovingAverage, setSmallestMovingAverage] = useState([]);

  /**
   * calculates the bullish, meaning days in a row where the closing price has gone up.
   * calculated everytime either a date is changed or a new file is uploaded.
   * 
   * @param {*} rows all the rows that are to be calculated
   * @param {*} start first date to include 
   * @param {*} end  last date to include
   */
  const calculateBullish = (rows, start, end) => {
    const filtered = rows.filter(row => row[0] >= start && row[0] <= end);
    let longest = 0;
    let current = 0;
    let value = 0;
    if (filtered.length > 0) {
      value = filtered[0][1];
      current++;
    }
    for (let i = 1; i < filtered.length; i++) {
      if (filtered[i][1] > value) {
        current++;
      } else {
        if (current > longest) {
          longest = current;
        }
        current = 1;
      }
      value = filtered[i][1];
    }
    if (current > longest) {
      longest = current;
    }
    setBullish(longest);
  }


  //AFTER DATA IS READ

  /**
   * Pre-calculates change in stock low-high for each day and organizes the list based on volume and then price change.
   * 
   * @param {*} rows 
   */
  const calculateVolumeAndChange = rows => {
    const list = [];
    for (let i = 0; i < rows.length - 1; i++) {

      list.push([rows[i][0], rows[i][2], (rows[i][4] - rows[i][5])]);
    }
    list.sort(function (row1, row2) {
      if (row1[1] > row2[1]) return -1;
      if (row1[1] == row2[1] && row1[2] > row2[2]) return -1;
      return 1;
    });
    setVolumeAndChange(list);
  }


  /**
   * Pre-calculates smallest moving average by summing the previous 5 closing values and dividing by the days open value for each day.
   * The resulting list is sorted based on the highest percentage.
   * Since the first 5 days cannot be calculated only results after the 5 day in the list are shown. 
   * However if the date range is within the list + 5 days, then all days in range will be shown.
   * 
   * @param {*} rows rows of data to be calculated
   * @returns 
   */
  const calculateSmallestMovingAverage = rows => {
    if (rows.length < 6) {
      return;
    }
    const list = [];
    let average = 1;
    let percentage = 0;
    let sumOfFive = rows[0][1] + rows[1][1] + rows[2][1] + rows[3][1] + rows[4][1];
    for (let i = 5; i < rows.length - 1; i++) {
      average = (sumOfFive / 5);
      percentage = (average / rows[i][3]) * 100;
      sumOfFive -= rows[i - 5][1];
      sumOfFive += rows[i][1];
      list.push([rows[i][0], percentage]);

    }
    list.sort((a, b) => (a[1] < b[1]) ? 1 : -1);
    setSmallestMovingAverage(list);
  }



  //PROCESS FILE

  /**
   * formats all results
   */
  const formatResults = () => {
    setBullish(0);
    setVolumeAndChange([]);
    setSmallestMovingAverage([]);
  }

  /**
   * Reads csv data and parses it into a more managable form then calls all the pre-calculation methods.
   * 
   * @param {*} dataString data from csv file
   */
  const processData = dataString => {

    formatResults();

    const list = [];
    const lines = dataString.split(/\n/);

    let date = new Date();
    let _close = 0.0;
    let volume = 0.0;
    let _open = 0.0;
    let high = 0.0;
    let low = 0.0;

    for (let i = 1; i < lines.length - 1; i++) {
      const row = lines[i].split(/[,\s$]+/);
      date = new Date(row[0]);
      _close = Number(row[1]);
      volume = Number(row[2]);
      _open = Number(row[3]);
      high = Number(row[4]);
      low = Number(row[5]);

      list.push([date, _close, volume, _open, high, low]);
    }
    list.sort((a, b) => a[0] - b[0]);
    setAllRows(list);
    calculateBullish(list, startDate, endDate);
    calculateVolumeAndChange(list);
    calculateSmallestMovingAverage(list);
  }


  //READ FILE


  /**
   * reads data from csv file and calls processData
   * 
   * @param {*} event new file uploaded 
   */
  const handleFileUpload = event => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (load) => {
      const text = load.target.result;
      const work = XLSX.read(text, { type: 'binary', dateNF: 'mm/dd/yyyy' });
      const workSheetName = work.SheetNames[0];
      const workSheet = work.Sheets[workSheetName];

      const data = XLSX.utils.sheet_to_csv(workSheet, { header: 1 });
      processData(data);
    };
    reader.readAsBinaryString(file);
  }


  //DATE CHANGE


  /**
   * sets new start date and calls calculate bullish with a new start date
   * 
   * @param {*} date 
   */
  const handleStartDateChange = date => {
    setStartDate(date);
    calculateBullish(allRows, date, endDate);
  }

  /**
   * sets new end date and calls calculate bullish with a new end date
   * 
   * @param {*} date new end date 
   */
  const handleEndDateChange = date => {
    setEndDate(date);
    calculateBullish(allRows, startDate, date)
  }



  //RENDER



  /**
   * Render list ordered by volumes and then change
   * 
   * @param {*} rowToRender 
   * @returns 
   */
  const renderVolumeAndChange = rowToRender => {
    return (
      <TableRow key={rowToRender[0]}>
        <TableCell>{rowToRender[0].toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
        <TableCell>{rowToRender[1]}</TableCell>
        <TableCell>{parseFloat(rowToRender[2]).toFixed(2)} $</TableCell>
      </TableRow>
    );
  }

  /**
   * Render list ordered by highest smallest moving average percentage
   * 
   * @param {*} rowToRender 
   * @returns 
   */
  const renderSMA = rowToRender => {
    return (
      <TableRow key={rowToRender[0]}>
        <TableCell>{rowToRender[0].toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
        <TableCell>{parseFloat(rowToRender[1]).toFixed(2)} %</TableCell>
      </TableRow>
    );
  }

  return (
    <div>
      <div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
        />
      </div>
      <div style={{ zIndex: 2, position: 'relative' }}>
        <DatePicker placeholderText="Select Start Date" selected={startDate} onChange={date => handleStartDateChange(date)} />
        <DatePicker placeholderText="Select End Date" selected={endDate} onChange={date => handleEndDateChange(date)} />
      </div>
      <div>
        <h3>Longest bullish: {bullish} days</h3>
      </div>

      <Grid container style={{ maxWidth: 800, zIndex: 1, position: 'relative' }} spacing={10}>
        <Grid item xs={6}>
          <Paper>
            <h3>Volume And Change</h3>
            <TableContainer style={{ maxHeight: '80vh' }}>

              <Table stickyHeader aria-label="sticky table" >
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell>change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {volumeAndChange.filter(row => row[0] >= startDate && row[0] <= endDate).map(renderVolumeAndChange)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper>
            <h3>Smallest Moving Average</h3>
            <TableContainer style={{ maxHeight: '80vh' }}>

              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {smallestMovingAverage.filter(row => row[0] >= startDate && row[0] <= endDate).map(renderSMA)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </div >
  );
}

export default App;
