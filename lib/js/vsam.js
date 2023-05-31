
//var slider, timeStart, timeEnd; // slider and selected values for time - reset on file load

var ctx;
var rawData = []; // holds raw data rows as read in from SMF64
var gData = []; // holds data grouped by DSN not summerized 
var gByDSN = []; // holds data grouped by DSN
var gByJob = []; // hodds data groubed by job for a specific DSN
var ugData = [];
var tableList = []; // List of selected tables, for reporting
var progressBar = [];
var overlay = $('<div class="spinner" id="spinner_overlay"></div>')

var currentDSN = "";

var debug = 0;

//Array.prototype.extend = function(array) {
//  for (var i = 0, len = array.length; i < len; ++i) {
//      this.push(array[i]);
//  };
//}

const plugin = { // used to generate white background for screenshots.  
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || '#99ffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};
// var progressbar, progressLabel;
//var colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850','#006837'];
//var colors = ['#003f5c','#2f4b7c','#665191','#a05195','#d45087','#f95d6a','#ff7c43','#ffa600'];
//var colorCounter = 0;


$(document).ready(function () {  
  // Setup debug options.  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("debug")) {debug = parseInt(urlParams.get("debug"));}
  if (isNaN(debug)) {debug = 0;}
  //console.log("urlParams:"+urlParams+" debug:"+debug)
  logStream(1, "urlParams:"+urlParams+" debug:"+debug);
  /**
   * .modal is used for help window  
   * **/
 
  $('.modal').on('click', function(e){
      e.preventDefault();
      $('<div/>', {'class':'myDlgClass', 'id':'link-'+($(this).index()+1)})
      .load($(this).attr('href')).appendTo('body').dialog().dialog("option","title","Help");
  });

  
  $("#rightcolumn").resizable({handles: 'e'}); // allow two columns to be resized.
  $("#leftcolumn").resizable({handles: 'e'});
  //$("#rightcolumn").draggable(); // if columns need to be moved at some point, does add challenges with where they go by default
  //$("#leftcolumn").draggable();

  $( "#navbar" ).menu({position: {at: "left bottom"}});

  new DateTime($('#startTime'), {
    format: 'h:mm a',
  });
  new DateTime($('#finishTime'), {
    format: 'h:mm a'
  });

  $("#spinner_overlay").hide();

  $('#applyFilters').click(function() {
    // alert("Applying Filters");
    $('.row').addClass("overlay");
    $("#spinner_overlay").show();
    setTimeout(function(){
      processRawData(true);
      $('.row').removeClass("overlay");
      $("#spinner_overlay").hide();
    },100);
    
  });

  ctx = $('#myChart');
  const testdata = {
    labels: [1,2,3,4,5,6,7],
    datasets: [{
      label: 'My First Dataset',
      data: [65, 59, 80, 81, 56, 55, 40],
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };
  // Create chart variable
  var myChart = new Chart(ctx, {
      type: 'line',
      data: [0,0]
  });

  slider = $( "#slider" ).slider({
    range: true,
    min: 0,
    max: 500,
    values: [ 75, 300 ],
    slide: function( event, ui ) {
        // console.log( ui.values[ 0 ] + "  " + ui.values[ 1 ] );
        logStream(1, "Slider Change: "+ui.values[ 0 ] + "  " + ui.values[ 1 ] )
        updateTime(ui.values[ 0 ], ui.values[ 1 ])
  },
});

  

  showDSNTable();
  
  /** 
   * handle file loading
   * allow for multiple files
   * provide progress bars
   * **/ 
  document.querySelector("#csv").addEventListener('change',function () {
    
    var files = document.querySelector("#csv").files; // a collection of files, if the user selects more than one
    //var fileCount = files.length;
    var loadedCount = 0; 
    //var loaderId = 0;
    var progressBar = [];
    // var overlay;
    Array.from(files).forEach(file => {
        logStream(1, "Loading file: "+file.name);
        // TBD perform validation on file type & size if required
        //loaderId +=1;
        var reader = new FileReader(); 
        reader.addEventListener('loadstart', function() {
          //progressbar.show(); 
          progressBar[file.name] = $('<div><div  class="progress-label">Loading:'+file.name+'</div></div>').progressbar({
            value: false,
          });
          $('#progressbars').append(progressBar[file.name]);
          $('#fileHeader').text("From fle: "+file.name);
          // $("#overlay").show();
          
          $('.row').addClass("overlay");
          $("#spinner_overlay").show();
        });

        reader.addEventListener('progress', function(e){
          if (e.lengthComputable) {
            var progress = ((e.loaded / e.total) * 50);
            progressBar[file.name].progressbar('value', progress);
            // console.log(e.loaded+" "+e.total);
          }
        });
    
        reader.addEventListener('load', function(e) { 
          
          var header = e.target.result.split('\n').shift().replace(/\s/g, '');
          // console.log(header);
          logStream(1, "File header:"+header)
          if( /R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,DATABUF,INDXBUF,SID,DATE,HH:MM:SS/.test(header)){
            var tempArray = d3.csvParse(e.target.result, processRow)
            for (var i = 0, len = tempArray.length; i < len; ++i) {
              rawData.push(tempArray[i]);
            };
            //rawData.extend(d3.csvParse(e.target.result, processRow));
            progressBar[file.name].progressbar('value', 100);
            //console.log("100");
            //$("#overlay").show();
            processRawData();
            //        R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,TIME OPEN,DOPEN,SITU,DATABUF,INDXBUF,SID,DATE,HH:MM:SS
            //        R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,TIME OPEN,DOPEN,SITU,DATABUF,INDXBUF,SID,DATE,HH:MM:SS
          } else if( /R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,TIMEOPEN,DOPEN,SITU,DATABUF,INDXBUF,SID,DATE,HH:MM:SS/.test(header)){
            // rawData = d3.csvParse(e.target.result, processRow);
            var tempArray = d3.csvParse(e.target.result, processRow)
            for (var i = 0, len = tempArray.length; i < len; ++i) {
              rawData.push(tempArray[i]);
            };
            //rawData.extend(d3.csvParse(e.target.result, processRow));
            processRawData(true);
          } else {
            alert("File format appears invalid");
          }
          
          setTimeout(removeItem(progressBar[file.name]), 5000);
          $("#spinner_overlay").hide();
          $('.row').removeClass("overlay");
          logStream(1, ".... finished loading: "+file.name+" rawData.length:"+rawData.length);
        });
        reader.readAsText(file);
    });
  });     
 });

function removeItem(item){
  item.remove();
}

function processRow(d){
  Object.keys(d).forEach(function(origProp) {
    var trimmedProp = origProp.trim().replace(/ /g,"_");
    if (trimmedProp !== origProp) {
      d[trimmedProp] = d[origProp];
      delete d[origProp];
    } 
  });
  if(d.SITU=="CLOT"){return null;}
  var tDate = new Date(parseInt("20"+d.DATE.slice(0,2)), 0); 
  var doy = parseInt(String(d.DATE).slice(2));
  var t = d['HH:MM:SS'].split(':');
  var h=parseInt(t[0]); var m=parseInt(t[1]); var s=parseInt(t[2]); 
  var TIME_CLOSE = ((h*60)+m)*60+s;
  tDate = new Date(tDate.setDate(doy));
  tDate = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDay(), h, m, s, 0);
  var oDate = new Date();
  if("TIME_OPEN" in d){
    d.DATE_OPEN = d.DOPEN.replace(/^0+/, '');
    d.TIME_OPEN = d.TIME_OPEN.replace(/^0+/, '');
    oDate = new Date(parseInt("20"+d.DATE_OPEN.slice(0,2)), 0);
    doy = parseInt(String(d.DATE_OPEN).slice(2));
    var totalMinutes = Math.floor(parseInt(d.TIME_OPEN) / 60);
    s = d.TIME_OPEN % 60;
    h = Math.floor(totalMinutes / 60);
    m = totalMinutes % 60;
    oDate = new Date(oDate.setDate(doy));
    oDate = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDay(), h, m, s, 0);
  } else {
    d.TIME_OPEN = 0;
    d.DATE_OPEN = 0;
  }
  
  d.timestamp = tDate;
  d.timestart = oDate;
  var timediff = tDate - oDate;
  if(timediff > 10){
    readRate = +d.READS / timediff;
    EXCPRate = +d.EXCPS / timediff;
    changeRate = (+d.INSERTS +d.DELETE +d.UPDATE) / timediff;
  }else {
    readRate = 0;
    EXCPRate = 0;
    changeRate = 0;
  }

  return{
    R_DSN: d.R_DSN.trim(), 
    R_JOB: d.R_JOB.trim(), 
    index_data: d.R_DNM.trim().split(/[.]+/).pop(),
    READS: +d.READS,
    EXCPS: +d.EXCPS, 
    DELETE: +d.DELETE,
    INSERTS: +d.INSERTS,
    UPDATE: +d.UPDATE, 
    changes: (+d.DELETE)+(+d.INSERTS)+(+d.UPDATE),
    RECCNT: +d.RECCNT, 
    RECLEN: +d.RECLEN, 
    size: ((+d.RECCNT)*(+d.RECLEN)) / 1024/1024/1024, 
    timestart: d.timestart, 
    timestamp: d.timestamp,
    timediff: timediff,
    readRate: readRate,
    EXCPRate: EXCPRate,
    changeRate: changeRate,
    DATABUF: +d.DATABUF, 
    DATE: d.DATE, 
    TIME_OPEN: parseInt(d.TIME_OPEN) ,
    TIME_CLOSE: TIME_CLOSE,
    DATE_OPEN: d.DATE_OPEN,
    time: d['HH:MM:SS'],
    INDXBUF: +d.INDXBUF, //"0000000"
    R_DDN: d.R_DDN,//"SYS00003"
    R_DNM: d.R_DNM.trim(), //"SYS1.LIVE.MAN1.DATA                         "
    SID: d.SID, //"LIVE"  
  };
 }


function processRawData(filters = false) {
  logStream(1, "preocessRawData("+filters+"0");
  // Filter raw data based on Filters, most notably time.
  
  if(filters){
    var maxSize = $('#maxSize');
    var size = parseFloat(maxSize.val());
    var regexInclude = $('#regexInclude'); 
    var regexExclude = $('#regexExclude');
    var startTime = $('#startTime').val(); // console.log("startTime: "+startTime);
    var finishTime = $('#finishTime').val(); // console.log("finishTime: "+finishTime);
    var filteredData= [];
    var timefilters = false; 
    var regexExcludeFilters = false;
    var regexIncludeFilters = false;
    if( regexExclude.val().length > 0){
      var exclude = new RegExp(regexExclude.val());
      regexExcludeFilters = true;
    }
    if( regexInclude.val().length > 0){
      var include = new RegExp(regexInclude.val());
      regexIncludeFilters = true;
    }

    if ((startTime.length > 2)&&(finishTime.length > 2)) {
      var [starthour, startminute, startampm] = startTime.split(/:| /);
      //console.log("startampm: "+startampm)
      if(starthour == "12"){starthour = "0"}
      var startsecond = parseInt(starthour)*60*60 + parseInt(startminute)*60;
      if(startampm=="pm") {startsecond = startsecond + 12*60*60;}
      console.log("startsecond: "+startsecond)
      var [finishthour, finishminute, finishampm] = finishTime.split(/:| /);
      if(finishthour == "12"){finishthour = "0"}
      var finishsecond = parseInt(finishthour)*60*60 + parseInt(finishminute)*60;
      if(finishampm=="pm") {finishsecond = finishsecond + 12*60*60;}
      console.log("finishsecond: "+finishsecond)
      timefilters = true;
      var sameday = true;
      if (startsecond > finishsecond) { sameday = false;}
    }
    //var count = 0
    filteredData = rawData.filter(function(d){
      // var value = true;
      if(timefilters){
        //count += 1;
        // if(count < 20) {console.log(d.TIME_OPEN+ " " + d.TIME_CLOSE);}
        if (sameday) {
          if(d.TIME_OPEN > d.TIME_CLOSE) { // differet day
            if((d.TIME_OPEN > finishsecond)&&(d.TIME_CLOSE < startsecond)){return false;}
          } else { // sameday 
            if((d.TIME_OPEN > finishsecond)||(d.TIME_CLOSE < startsecond)){return false;}
          }
        } else {
          if(d.TIME_OPEN <= d.TIME_CLOSE) {
            if((d.TIME_OPEN > finishsecond)&&(d.TIME_CLOSE < startsecond)){return false;}
          } 
        }
      }
      if(regexIncludeFilters){
        if(!include.test(d.R_DSN)) {return false;}
      }
      if(regexExcludeFilters){
        if(exclude.test(d.R_DSN)) {return false;}
      }
      var tSize = d.RECLEN*d.RECCNT/1024.0/1024.0/1024.0;
      if( !isNaN(size) && tSize > size) {return false;}
      return true;
    });
    //console.log ("Filtered Data length: "+ filteredData.length);
    logStream(1, "Filtered Data length: "+ filteredData.length);
  } else {
    filteredData = rawData;
    //console.log ("Raw Data length: "+ filteredData.length);
    logStream(1, "Raw Data length: "+ filteredData.length);
  }
  gData = d3.group(filteredData, d=>d.R_DSN);
  gByDSN.splice(0, gByDSN.length);
  // console.log(gData);
  for (let [key, value] of gData){
    var item = {
      DSN: key,
      Reads: d3.sum(value, d=>d.READS),
      EXCPS: d3.sum(value, d=>d.EXCPS),
      Deletes: d3.sum(value, d=>d.DELETE),
      Inserts: d3.sum(value, d=>d.INSERTS),
      Updates: d3.sum(value, d=>d.UPDATE), 
      Changes: d3.sum(value, d=>d.changes),
      Size: d3.max(value, d=>d.size),
      Longest: d3.max(value, d=>d.RECLEN),
      Most: d3.max(value, d=>d.RECCNT), 
      Latest: d3.max(value, d=>d.timestamp),
      Earliest: d3.min(value, d=>d.timestamp),
      Records: d3.count(value, d=>d.READS),
      Unique: d3.group(value, d=>d.R_JOB).size,
      TimeOpen: d3.sum(value, d=>d.timediff),
    };
    gByDSN.push(item);
  };
  //console.log(gByDSN.sort((a,b)=> {return a.Reads > b.Reads ? -1:1}));
  $('#mainTable').DataTable().clear().rows.add(gByDSN).order([1,'desc']).draw();
  logStream(1, "Update mainTable.  Length: "+ filteredData.length);
}

function groupDataByJob(DSN) {
  logStream(1, "groupDataByJob("+ DSN+")");
  var jData = d3.group(gData.get(DSN), d=>d.R_JOB);
  // console.log(jData);
  logStream(1, "jData.length:"+ jData.length);
  gByJob.splice(0, gByJob.length);
  
  for (let [key, value] of jData){
    var item = {
      DSN: DSN, 
      Job: key,
      Reads: d3.sum(value, d=>d.READS),
      EXCPS: d3.sum(value, d=>d.EXCPS),
      Deletes: d3.sum(value, d=>d.DELETE),
      Inserts: d3.sum(value, d=>d.INSERTS),
      Updates: d3.sum(value, d=>d.UPDATE), 
      Changes: d3.sum(value, d=>d.changes),
      File_Size: d3.max(value, d=>d.size),
      Longest_record: d3.max(value, d=>d.RECLEN),
      Most_records: d3.max(value, d=>d.RECCNT), 
      Last_close: d3.max(value, d=>d.timestamp),
      First_close: d3.min(value, d=>d.timestamp),
      Number_open_close: d3.count(value, d=>d.READS),
      TimeOpen: d3.sum(value, d=>d.timediff),
    };
    gByJob.push(item);
  };
  // console.log(gByJob);
  logStream(1, "gByJob.length:"+ gByJob.lengthSN);
  // console.log(gByJob.sort((a,b)=> {return a.reads > b.reads ? -1:1}));
  $('#jobTable').DataTable().clear().rows.add(gByJob).order([1,'desc']).draw();
 // $('#jobTable').order([1,'desc']).draw();
  $('#jobTableHeader').text("Aggregated by Job for "+DSN);
  currentDSN = DSN;
  // showDSNTable();
}

function showDataForJob(job) {
  logStream(1, "showDataForJob("+job+")");
  if(currentDSN.length > 1 ){
   // console.log(job.length);
    if(job.length > 1) {
      ugData = gData.get(currentDSN).filter(function (d){
        $('#rawTableHeader').text("Raw records for "+currentDSN+" and "+job);
        return d.R_JOB == job;
      });
    }else {
      ugData = gData.get(currentDSN);
      $('#rawTableHeader').text("Raw records for "+currentDSN);
    }
    //console.log(ugData);
    $('#rawTable').DataTable().clear().rows.add(ugData).order([0,'desc']).draw();
    // $('#rawTableHeader').text("Raw records for "+currentDSN+" and "+job);
  }
}



function showDSNTable(){
  logStream(1, "showDSNTable()");
  var table = $('#mainTable').DataTable({
    scrollX: true,
    data: gByDSN,
    columnDefs:[
      {className: 'dt-body-right', targets:[1,2,3,4,5,6,7,8,9]},
    ],
    columns: [
        { data: 'DSN', title: "DSN"},
        { data: 'Reads' , title: "Reads", render: d=>d.toLocaleString('en-US')},
        { data: 'EXCPS' , title: "EXCPS", render: d=>d.toLocaleString('en-US')},
        { data: 'Inserts', title: "Inserts", render: d=>d.toLocaleString('en-US')},
        { data: 'Deletes', title: "Delets", render: d=>d.toLocaleString('en-US')},
        { data: 'Updates', title: "Updates", render: d=>d.toLocaleString('en-US')},
        { data: 'Changes', title: "Changes", render: d=>d.toLocaleString('en-US')},
        { data: 'Records', title: "Open and Close Count", visible: false, render: d=>d.toLocaleString('en-US')},
        { data: 'Unique', title: "Unique Jobs", render: d=>d.toLocaleString('en-US')},
        { data: 'Size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'Earliest' , title: "From", render: d=>d.toLocaleString("en-US",{datestyle:'short', timestyle:'medium'})},
        { data: 'Latest' , title: "To", render: d=>d.toLocaleString()},
        { data: 'TimeOpen', title: "Time Open", render: d=>convertMS(d/2)},
        { data: 'TimeOpen', title: "Time Open (secs)", render: d=>d/2000},
    ],
    dom: 'Bfrtip',
    buttons: [
      {
        extend: 'excelHtml5', 
        header:true, 
        title:null, 
        filename: 'Summary by DSN',
        exportOptions: {
          columns: ':visible'
        }
      }, 
      'print', 'colvis',
    ],
    select: true
  });

  var jobTable = $('#jobTable').DataTable({
    scrollX: true,
    data: gByJob,
    columnDefs:[
      {className: 'dt-body-right', targets:[1,2,3,4,5,6,7,8,9]},
    ],
    columns: [
        { data: 'Job', title: "JOB"},
        { data: 'Reads' , title: "Reads", render: d=>d.toLocaleString('en-US')},
        { data: 'EXCPS' , title: "EXCPS", render: d=>d.toLocaleString('en-US')},
        { data: 'Changes', title: "Changes", render: d=>d.toLocaleString('en-US')},
        { data: 'Number_open_close', title: "Open and Close count", render: d=>d.toLocaleString('en-US')},
        { data: 'File_Size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'First_close' , title: "First Close", render: d=>d.toLocaleString()},
        { data: 'Last_close' , title: "Last Close", render: d=>d.toLocaleString()},
        { data: 'Longest_record' , title: "Longest Record", visible: false},
        { data: 'Most_records' , title: "Most Record", visible: false},
        { data: 'TimeOpen', title: "Time Open", render: d=>convertMS(d/2)},
        { data: 'TimeOpen', title: "Time Open (secs)", render: d=>d/2000},
    ],
    dom: 'Bfrtip',
    buttons: [
      {
        extend: 'excelHtml5', 
        header:true, 
        title:null, 
        filename: function(){return $('#jobTableHeader').text()}, 
        exportOptions: {
          columns: ':visible'
        }
      }, 
      'print', 'colvis',
    ],
    select: true
  });

  var rawTable = $('#rawTable').DataTable({
    scrollX: true,
    data: ugData,
    columnDefs:[
      {className: 'dt-body-right', targets:[2,3,4,5,6,7,8,9,10,11,12,13]},
    ],
    columns: [
      { data: 'R_DSN', title: "DSN", visible: false},
      { data: 'R_JOB', title: "Job"},
      { data: 'index_data', title: "Type", visible: false},
      { data: 'READS' , title: "Reads", render: d=>d.toLocaleString('en-US')},
      { data: 'EXCPS' , title: "EXCPS", render: d=>d.toLocaleString('en-US')},
      { data: 'DELETE' , title: "Deletes", render: d=>d.toLocaleString('en-US'), visible: false},
      { data: 'INSERTS' , title: "Inserts", render: d=>d.toLocaleString('en-US'), visible: false},
      { data: 'UPDATE' , title: "Updates", render: d=>d.toLocaleString('en-US'), visible: false},
      { data: 'changes' , title: "Changes", render: d=>d.toLocaleString('en-US')},
      { data: 'RECCNT' , title: "Record Count", render: d=>d.toLocaleString('en-US'), visible: false},
      { data: 'RECLEN' , title: "Record Length", render: d=>d.toLocaleString('en-US'), visible: false},
      { data: 'size' , title: "Size (GB)", render: d=>d.toLocaleString('en-US')},
      { data: 'timestart' , title: "Opened", render: d=>d?.toLocaleString()}, 
      { data: 'timestamp' , title: "Closed", render: d=>d.toLocaleString()},
      { data: 'timediff',  title: "Time Open (secs)", render: d=>convertMS(d), visible: false},
      { data: 'readRate',  title: "Reads/Second", render: d=>d.toPrecision(2), visible: false},
      { data: 'EXCPRate',  title: "EXCPS/Second", render: d=>d.toPrecision(2), visible: false},
      { data: 'changeRate',  title: "Changes/Second", render: d=>d.toPrecision(2), visible: false},
    ],
    dom: 'Bfrtip',
    buttons: [
      {
        extend: 'excelHtml5', 
        header:true, 
        title:null,
        filename: function(){return $('#rawTableHeader').text()}, 
        exportOptions: {
          columns: ':visible'
        }
      }, 
      'csv','print', 'colvis',
    ],
    select: true
  });
  

  $('#mainTable tbody').on('click', 'tr', function () {
      var data = table.row(this).data();
      //alert('You clicked on ' + data['key'] + "'s row");
      // addTableToList(data['key']);
      groupDataByJob(data['DSN']);
      currentDSN = data['DSN'];
      showDataForJob("");
      showPlot("");
      addTableToList(data['DSN']);
    });

  $('#jobTable tbody').on('click', 'tr', function () {
    var data = jobTable.row(this).data();
    //alert('You clicked on ' + data['key'] + "'s row");
    // addTableToList(data['key']);
    showDataForJob(data['Job']);
    showPlot(data['Job']);
  });
}

var plotData = [];

function showPlot(){
  logStream(1, "showPlot()");
  plotData.splice(0, plotData.length)
  ugData.forEach(function (d){
    if((d.timediff > 10)&&(d.READS > 100)){
      var data = [];
      data.push({timestamp: d.timestart, readRate: d.readRate});
      data.push({timestamp: d.timestamp, readRate: d.readRate});
      var item = {label: d.R_JOB, data:data}
      plotData.push(item);
    }
  });
  // console.log("startTime: "+startTime+"finishTime: "+finishTime);
  plotTable(ctx, Chart.getChart('mychart'), plotData);
  var maxTime = d3.max(plotData, function(ld){return d3.max(ld.data, function(d){return d.timestamp})});
  var minTime = d3.min(plotData, function(ld){return d3.min(ld.data, function(d){return d.timestamp})});
  
  slider.slider("option", "min", minTime.getTime()); slider.slider("option", "max", maxTime.getTime());
  slider.slider('values',0,minTime.getTime()); // sets first handle (index 0) to 50
  slider.slider('values',1,maxTime.getTime());

  
  // update max and min time on slider
}

function updatePlot(startTime, finishTime){
  logStream(1, "updatePlot("+startTime+","+finishTime+")");
  // assume ugData how filtered list
  // var plotData = [];
  var updatedPlotData = []
  // var count = 0;
  ugData.forEach(function (d){
    if(startTime > 0 && finishTime > 0){
      updatedPlotData = plotData.filter(function (d) {
        return ((d.data[0].timestamp <finishTime) && (d.data[1].timestamp > startTime));
      });
    }
  });
  console.log("startTime: "+startTime+"finishTime: "+finishTime);
  plotTable(ctx, Chart.getChart('mychart'), updatedPlotData);
  
  // update max and min time on slider
}

function downloadReport(){
  logStream(1, "downloadReport()");
  var element = document.getElementById('report');
  var opt = {
    margin:       1,
    filename:     'html2pdf_example.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    pagebreak:    { mode: 'avoid-all', after: '#break' },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  // Choose the element that our invoice is rendered in.
  html2pdf().set(opt).from(element).save();
}

function generateReport(detailed){
  logStream(1, "generateReport("+detailed+")");
  // $('#report').empty();
  const workbook = XLSX.utils.book_new();
  var tableData = [];
  
  var worksheet = XLSX.utils.json_to_sheet(gByDSN);
  worksheet['!autofilter'] = { ref:"A1:N"+ (gByDSN.length +1).toString()};
  XLSX.utils.book_append_sheet(workbook, worksheet, "DSN");
  logStream(1, "DSN worksheet:"+"A1:N"+ (gByDSN.length +1).toString())

  tableList.forEach(table => {
    var jData = d3.group(gData.get(table), d=>d.R_JOB);
    
    for (let [key, value] of jData){
      var item = {
        key: key,
        reads: d3.sum(value, d=>d.READS),
        excps: d3.sum(value, d=>d.EXCPS),
        deletes: d3.sum(value, d=>d.DELETE),
        inserts: d3.sum(value, d=>d.INSERTS),
        updates: d3.sum(value, d=>d.UPDATE), 
        changes: d3.sum(value, d=>{return d.DELETE+d.INSERTS+d.UPDATE}),
        size: d3.max(value, d=>{return d.RECLEN*d.RECCNT/1024.0/1024.0/1024.0}),
        longest: d3.max(value, d=>d.RECLEN),
        most: d3.max(value, d=>d.RECCNT), 
        latest: d3.max(value, d=>d.timestamp),
        earliest: d3.min(value, d=>d.timestamp),
        instances: d3.count(value, d=>d.READS)
      };
      tableData.push(item);
    };
    worksheet = XLSX.utils.json_to_sheet(tableData);
    worksheet['!autofilter'] = { ref:"A1:M"+ (tableData.length +1).toString()};
    XLSX.utils.book_append_sheet(workbook, worksheet, (table.length > 31 ? table.substring(0,30):table));
    logStream(1, table.length > 31 ? table.substring(0,30):table+" worksheet:"+"A1:M"+ (tableData.length +1).toString())
    // const max_width = tableData.reduce((w, r) => Math.max(w, r.name.length), 10);
    // worksheet["!cols"] = [ { wch: max_width } ];
    if(detailed){
      worksheet = XLSX.utils.json_to_sheet(gData.get(table));
      worksheet['!autofilter'] = { ref:"A1:Z"+ (gData.get(table).length +1).toString()};
      XLSX.utils.book_append_sheet(workbook, worksheet, (table.length > 27 ? table.substring(0,26)+"-raw":table+"-raw" ));
      logStream(1, table.length > 27 ? table.substring(0,26)+"-raw":table+"-raw" +" worksheet:"+"A1:Z"+ (gData.get(table).length +1).toString())
    }
    
  }); 

  XLSX.writeFile(workbook, "analysis.xlsx", { compression: true });


  
}

/** updateTime()
 * Update graph filtering based  on start and end time values
 * **/
function updateTime(startTime, finishTime){
  logStream(1, "updateTime("+startTime+","+finishTime+")");
 var myChart = Chart.getChart('myChart');
  myChart.options.scales.x.min = startTime;
  myChart.options.scales.x.max = finishTime;
  
  myChart.update();

}
  
/** updateObjectList 
 *  Builds the list of objects, including options to delete, make invisible, etc
 * **/
function updateObjectList(){
  logStream(1, "updateObjectList()");
  var loadedObjects = $('#loadedObjects')
  // var colors = ['#FF0000', '#00FF00', '#0000FF', '#808080']
  
  loadedObjects.empty();
  for(var key in tableList) {
    
    //var vis_icon = '<span class="ui-icon ui-icon-check" onclick="showItem('+key+')"></span><span class="ui-icon ui-icon-blank"></span>';
    
    loadedObjects.append(
      '<div>' 
      //+ vis_icon
      + '<span class="ui-icon ui-icon-trash" onclick="deleteItem('+key+')"></span>'
      //+ '<span class="ui-icon ui-icon-pencil" onclick="editLabelPopup('+key+')"></span>'
      + tableList[key]+'</div>'
    )
  }
}

function addTableToList(value){
  logStream(1, "addTableToList("+value+")");
  if(!tableList.includes(value)){tableList.push(value);}
  updateObjectList();
}

/**
 * editLabelPopup - brings up the edit label dialog, and sets the values
 * updateLabel - then does the actual label updating, once users has entered the information
 * **
function editLabelPopup(i){
  // console.log(i);
  labelID.val(i);
  label.val(tableStats[i].label);
  fullID.val(tableStats[i].id);
  accessRateMax.val(tableStats[i].accessRateMax);
  accessRateAve.val(tableStats[i].accessRateAve);
  updateRateMax.val(tableStats[i].updateRateMax);
  updateRateAve.val(tableStats[i].updateRateAve);
  editLabelDialog.dialog("open");
}
function updateLabel(){
  // console.log (labelID.val() + " " + label.val());
  tableStats[labelID.val()].label = label.val();
  editLabelDialog.dialog("close");
  updateObjectList();
} /

/** 
 * deleteItem deletes and item from the list of plottable items
 * **/
function deleteItem(key){
  logStream(1, "deleteItem("+key+")");
  tableList.splice(key, 1);
  updateObjectList();
}

/** 
 * hideItem changes the visibility of an item.
 * **
function hideItem(i){
  tableStats[i].hidden = true;
  updateObjectList();
  Chart.getChart('myChart').update();
} **/

/**
 * showItem changes the visitilbity of an item
 * 
function showItem(i){
  tableStats[i].hidden = false;
  updateObjectList();
  Chart.getChart('myChart').update();
} **/

/**
 * Update Color, updates the color of the item, based on 
 * 
function updateColor(i, color){
  console.log("updating color of "+i+" with "+color.value+" from "+tableStats[i].borderColor);
  tableStats[i].borderColor = color.value;
  updateObjectList();
  Chart.getChart('myChart').update();
} **/

/** 
 * Screen shot takes a PNG of the current chart and downloads it.  
 * TODO: add white background before downloading.
 * **/
function screenShot(){
  logStream(1, "screenShot()");
  var a = document.createElement('a');
  //a.href = Chart.getChart('myChart').toBase64Image("image/png", 1.0);
  a.href = document.getElementById('myChart').toDataURL('image/png');
  a.download = 'screenshot.png';
  a.click();
}

function plotTable(canvas, chart, toPlot){
  //console.log(item)
  // toPlot = tableStats.filter(function(el){ return el.id === itemId});
  // console.log(toPlot);
  const cfg = {
    type: 'line',
    data: { datasets: toPlot},
    options: {
      parsing: { xAxisKey: 'timestamp', yAxisKey: 'readRate' },
      // events: ['onhover'] ,
      scales: {
          x: {
              type: 'time',
              time: {
                //parser: 'MM/DD/YYYY HH:mm',
                tooltipFormat: 'MM/dd/yyyy HH:mm',
                minUnit: 'hour',
                unitStepSize: 6,
                displayFormats: {
                  'hour': 'HH:00',
                  'day': 'MM/dd/yyyy'
                }
              },
              /**time: {
                  unit: 'hour',
                  unitStepSize: 6,
              }, **/
              ticks:{
                enabled: true,
                callback: function(val, index) {
                  // Hide every 2nd tick label
                  //console.log(val + " " + index + " "+ this.getLabelForValue(val));
                  return this.getLabelForValue(val);
                },
              },
              title: {
                display: true, 
                text:"Time",
              }
          },
          y: {
            title: {
              display: true,
              text: "Read rate (reads/second)",
            }
          }
      },
      animation: {
          duration: 0
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      plugins: {
        //legend: {
          //display: false
        //},
        legend: {
          display: false,
          position: 'right',
          labels: {
            usePointStyle:true,
            pointStyle: 'line',
            filter: function(legendItem, data) {
              let label = data.datasets[legendItem.datasetIndex].label || '';
              if (data.datasets[legendItem.datasetIndex].hidden){
                return false;
              }
              return label;
            }
          }
        },
        customCanvasBackgroundColor: {
          color: 'white',
        },
        tooltip:{
          enabled: true,
          mode: 'point',
          callbacks: {
            label: function(context){
              let label = context.dataset.label || '';
              if (label) {
                  label += ': ' + parseFloat(context.formattedValue).toFixed(0);
                  label += ' @ ' + context.label;
              }
              //console.log(context);
              return label;
            }
          }
        },
        
      }  
    },
    plugins: [plugin],
  };
  chart = Chart.getChart('myChart')
  chart.destroy();
  chart = new Chart(canvas, cfg);
}

var debugLevels = ["none", "Info", "Warn", "Error", "Critical"]
function logStream (level, text){
  if ((debug == 0)||(level > debug)) {return;}
  console.log (new Date().toISOString()+" ["+debugLevels[level]+"] "+text);
}

function convertMS(ms) {
  var d, h, m, s;
  s = Math.floor(ms / 1000);
  m = Math.floor(s / 60);
  s = s % 60;
  h = Math.floor(m / 60);
  m = m % 60;
  d = Math.floor(h / 24);
  h = h % 24;
  h += d * 24;
  return h + ':' + m + ':' + s;
}