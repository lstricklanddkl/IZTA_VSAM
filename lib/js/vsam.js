
//var slider, timeStart, timeEnd; // slider and selected values for time - reset on file load

var rawData = []; // holds raw data rows as read in from SMF64
var gData = []; // holds data grouped by 
var gByDSN = []; // holds data grouped by DSN
var gByJob = []; // hodds data groubed by job for a specific DSN
var ugData = [];
var tableList = []; // List of selected tables, for reporting
var progressBar = [];

var currentDSN = "";

// var progressbar, progressLabel;
//var colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850','#006837'];
//var colors = ['#003f5c','#2f4b7c','#665191','#a05195','#d45087','#f95d6a','#ff7c43','#ffa600'];
//var colorCounter = 0;


$(document).ready(function () {  
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

  /* progressbar = $( "#progressbar" ),
  progressLabel = $( ".progress-label" );
 
    progressbar.progressbar({
      value: false,
      change: function() {
        progressLabel.text( progressbar.progressbar( "value" ) + "%" );
      },
      complete: function() {
        progressLabel.text( "Complete!" );
      }
    }).hide(); */
    
    //function progress() {
    //  var val = progressbar.progressbar( "value" ) || 0;
 
    //  progressbar.progressbar( "value", val + 2 );
 
    //  if ( val < 99 ) {
    //    setTimeout( progress, 80 );
    //  }
    //  else progressbar.hide();
    //}
 
    //setTimeout( progress, 2000 );

  showDSNTable();

  /* slider = $( "#slider" ).slider({
      range: true,
      min: 0,
      max: 500,
      values: [ 75, 300 ],
      slide: function( event, ui ) {
          //console.log( ui.values[ 0 ] + "  " + ui.values[ 1 ] );
          timeStart = ui.values[ 0 ];
          timeEnd = ui.values[ 1 ];
      updateTime();
    },
  }); */
  
  /** 
   * handle file loading
   * allow for multiple files
   * provide progress bars
   * **/ 
  document.querySelector("#csv").addEventListener('change',function () {
    
    var files = document.querySelector("#csv").files; // a collection of files, if the user selects more than one
    //var fileCount = files.length;
    //var loadedCount = 0; 
    var loaderId = 0;
    var progressBar = [];
    Array.from(files).forEach(file => {
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
          console.log(header);
          if( /R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,DATABUF,INDXBUF,SID,DATE,HH:MM:SS/.test(header)){
            rawData = d3.csvParse(e.target.result, processRow);
            progressBar[file.name].progressbar('value', 100);
            console.log("100");
            processRawData();
            //        R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,TIMEOPEN,DOPEN,SITU,DATABUF,INDXBUF,SID,DATE,HH:MM:SS
          } else if( /R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,TIMEOPEN,DOPEN,SITU,DATABUF,INDXBUF,SID,DATE,HH:MM:SS/.test(header)){
              rawData = d3.csvParse(e.target.result, processRow);
              progressBar[file.name].progressbar('value', 100);
              console.log("100");
              processRawData();
          } else {
            alert("File format appears invalid");
          }
          
          setTimeout(removeItem(progressBar[file.name]), 5000);
           // deally do this after 2 seconds
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
    if(d.R_DSN.trim() == "KFRAMPP.PB.KFRARSKD.RKINFO.UNLD"){
      console.log(oDate.toLocaleString());
    }
  } else {
    d.TIME_OPEN = 0;
    d.DATE_OPEN = 0;
  }
  
  d.timestamp = tDate;
  d.timestart = oDate;
  var timediff = tDate - oDate;
  return{
      DATABUF: +d.DATABUF, 
      DATE: d.DATE, 
      TIME_OPEN: d.TIME_OPEN,
      DATE_OPEN: d.DATE_OPEN,
      timestamp: d.timestamp,
      timestart: d.timestart, 
      timediff: timediff,
      // timestartstring: d.timestart.toLocaleString(),
      time: d['HH:MM:SS'],
      DELETE: +d.DELETE, //"00000000000"
      EXCPS: +d.EXCPS, //"00000054873"
      INDXBUF: +d.INDXBUF, //"0000000"
      INSERTS: +d.INSERTS,//"00000000000"
      READS: +d.READS, //"00000000000"
      RECCNT: +d.RECCNT, //"00000000000"
      RECLEN: +d.RECLEN, //"00000032767"
      R_DDN: d.R_DDN,//"SYS00003"
      R_DNM: d.R_DNM.trim(), //"SYS1.LIVE.MAN1.DATA                         "
      R_DSN: d.R_DSN.trim(), //"SYS1.LIVE.MAN1                              "
      R_JOB: d.R_JOB.trim(), //"SMF     "
      SID: d.SID, //"LIVE"
      UPDATE: +d.UPDATE //"00000000000"
    };
 }


function processRawData() {
  gData = d3.group(rawData, d=>d.R_DSN);
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
      Changes: d3.sum(value, d=>{return d.DELETE+d.INSERTS+d.UPDATE}),
      Size: d3.max(value, d=>{return d.RECLEN*d.RECCNT/1024.0/1024.0/1024.0}),
      Longest: d3.max(value, d=>d.RECLEN),
      Most: d3.max(value, d=>d.RECCNT), 
      Latest: d3.max(value, d=>d.timestamp),
      Earliest: d3.min(value, d=>d.timestamp),
      Records: d3.count(value, d=>d.READS),
      Unique: d3.group(value, d=>d.R_JOB).size,
    };
    gByDSN.push(item);
  };
  console.log(gByDSN.sort((a,b)=> {return a.Reads > b.Reads ? -1:1}));
  $('#mainTable').DataTable().clear().rows.add(gByDSN).order([1,'desc']).draw();
}

function groupDataByJob(DSN) {
  // console.log(DSN);
  //console.log(gData.get(DSN));
  var jData = d3.group(gData.get(DSN), d=>d.R_JOB);
  console.log(jData);
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
      Changes: d3.sum(value, d=>{return d.DELETE+d.INSERTS+d.UPDATE}),
      Size: d3.max(value, d=>{return d.RECLEN*d.RECCNT/1024.0/1024.0/1024.0}),
      Longest: d3.max(value, d=>d.RECLEN),
      Most: d3.max(value, d=>d.RECCNT), 
      Latest: d3.max(value, d=>d.timestamp),
      Earliest: d3.min(value, d=>d.timestamp),
      Instances: d3.count(value, d=>d.READS)
    };
    gByJob.push(item);
  };
  console.log(gByJob);
  // console.log(gByJob.sort((a,b)=> {return a.reads > b.reads ? -1:1}));
  $('#jobTable').DataTable().clear().rows.add(gByJob).order([1,'desc']).draw();
 // $('#jobTable').order([1,'desc']).draw();
  $('#jobTableHeader').text("Aggregated by Job for "+DSN);
  currentDSN = DSN;
  // showDSNTable();
}

function showDataForJob(job) {
  //console.log(DSN);
  //console.log(gData.get(DSN));
  //var jData;
  //console.log(job+" "+currentDSN);
  //console.log(gData);
  //ugData.splice(0, ugData.length);
  if(currentDSN.length > 1 ){
    console.log(job.length);
    if(job.length > 1) {
      ugData = gData.get(currentDSN).filter(function (d){
        return d.R_JOB == job;
      });
      console.log("length > 1")
    }else {
      ugData = gData.get(currentDSN);
    }
    console.log(ugData);
    $('#rawTable').DataTable().clear().rows.add(ugData).order([0,'desc']).draw();
    $('#rawTableHeader').text("Raw records for "+currentDSN+" and "+job);
  }
}

function showDSNTable(){
  var maxSize = $('#maxSize');
  var regexInclude = $('#regexInclude');
  var regexExclude = $('#regexExclude');
  $('#applyFilters').click(function(){
    //console.log("button clicked"); 
    table.draw();});
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex){
    if (settings.nTable.id !== 'mainTable'){
      return true;
    }
    var size = parseFloat(maxSize.val());
    var tSize = parseFloat(data[6]) ||0;
    //console.log(tbleSize+" "+size);
    var value = true;
    
    if( regexExclude.val().length > 0){
      var exclude = new RegExp(regexExclude.val());
      value = !exclude.test(data[0]);
      // console.log(value + " " +data[0]);
    }
    if( regexInclude.val().length > 0){
      var include = new RegExp(regexInclude.val());
      value = include.test(data[0]);
      // console.log(value + " " +data[0]);
    }

    if( !isNaN(size) && tSize > size) {value = false;}
    
    return value;
  });

  
  var table = $('#mainTable').DataTable({
    
    data: gByDSN,
    columns: [
        { data: 'DSN', title: "DSN"},
        { data: 'Reads' , title: "Reads"},
        { data: 'EXCPS' , title: "EXCPS"},
        { data: 'Changes', title: "Changes"},
        { data: 'Records', title: "# or Records"},
        { data: 'Unique', title: "Unique Jobs"},
        { data: 'Size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'Earliest' , title: "From", render: d=>d.toLocaleString("en-US",{datestyle:'short', timestyle:'medium'})},
        { data: 'Latest' , title: "To", render: d=>d.toLocaleString()},
    ],
    dom: 'Bfrtip',
    buttons: [
      'excel', 'print', 'colvis',
    ],
    select: true
  });

  var jobTable = $('#jobTable').DataTable({
    data: gByJob,
    columns: [
        { data: 'Job', title: "JOB"},
        { data: 'Reads' , title: "Reads"},
        { data: 'EXCPS' , title: "EXCPS"},
        { data: 'Changes', title: "Changes"},
        { data: 'Instances', title: "Close Count"},
        { data: 'Size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'Earliest' , title: "From", render: d=>d.toLocaleString()},
        { data: 'Latest' , title: "To", render: d=>d.toLocaleString()},
    ],
    dom: 'Bfrtip',
    buttons: [
      'excel', 'print', 'colvis',
    ],
    select: true
  });

  var rawTable = $('#rawTable').DataTable({
    data: ugData,
    columns: [
        { data: 'R_JOB', title: "Job"},
        { data: 'READS' , title: "Reads"},
        { data: 'EXCPS' , title: "EXCPS"},
        { data: 'DELETE' , title: "deletes"},
        { data: 'INSERTS' , title: "inserts"},
        { data: 'UPDATE' , title: "updates"},
        { data: 'timestamp' , title: "Closed", render: d=>d.toLocaleString()},
        { data: 'timestart' , title: "Opened", render: d=>d?.toLocaleString()}, 
        { data: 'timediff',  title: "Difference"},
    ],
    dom: 'Bfrtip',
    buttons: [
      'excel', 'print', 'colvis',
    ],
    select: true
  });
  //maxSize.on('input', function (){
    //table.draw();
    //console.log("redraw");
  //})

  $('#mainTable tbody').on('click', 'tr', function () {
      var data = table.row(this).data();
      //alert('You clicked on ' + data['key'] + "'s row");
      // addTableToList(data['key']);
      groupDataByJob(data['DSN']);
      currentDSN = data['DSN'];
      showDataForJob("");
      addTableToList(data['DSN'])
    });

  $('#jobTable tbody').on('click', 'tr', function () {
    var data = jobTable.row(this).data();
    //alert('You clicked on ' + data['key'] + "'s row");
    // addTableToList(data['key']);
    showDataForJob(data['Job']);
  });
}

function showRawTable(key){

}


function downloadReport(){
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
  // $('#report').empty();
  const workbook = XLSX.utils.book_new();
  var tableData = [];
  
  var worksheet = XLSX.utils.json_to_sheet(gByDSN);
  worksheet['!autofilter'] = { ref:"A1:M"+ (gByDSN.length +1).toString()};
  XLSX.utils.book_append_sheet(workbook, worksheet, "DSN");

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
    // const max_width = tableData.reduce((w, r) => Math.max(w, r.name.length), 10);
    // worksheet["!cols"] = [ { wch: max_width } ];
    if(detailed){
      worksheet = XLSX.utils.json_to_sheet(gData.get(table));
      worksheet['!autofilter'] = { ref:"A1:B"+ (jData.length +1).toString()};
      XLSX.utils.book_append_sheet(workbook, worksheet, (table.length > 27 ? table.substring(0,26)+"-raw":table+"-raw" ));
    }
    
  }); 

  XLSX.writeFile(workbook, "analysis.xlsx", { compression: true });


  /** For each table in tablelist.
   *  1. Get table from var jData = d3.group(gData.get(table), d=>d.R_JOB);
   *  2. create JSON object
   * 
   * for (let [key, value] of jData){
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

    // Create workbook
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, table);
    const max_width = tableData.reduce((w, r) => Math.max(w, r.name.length), 10);
    worksheet["!cols"] = [ { wch: max_width } ];
    XLSX.writeFile(workbook, "analysis.xlsx", { compression: true });
   * **/

}

/** updateTime()
 * Update graph filtering based  on start and end time values
 * **/
function updateTime(){
  /** var myChart = Chart.getChart('myChart');
  myChart.options.scales.x.min = timeStart;
  myChart.options.scales.x.max = timeEnd;
  // If time difference between timeStart and timeEnd is small, add in 6 hour ticks
  myChart.update(); **/
}
  
/** updateObjectList 
 *  Builds the list of objects, including options to delete, make invisible, etc
 * **/
function updateObjectList(){
  var loadedObjects = $('#loadedObjects')
  // var colors = ['#FF0000', '#00FF00', '#0000FF', '#808080']
  
  loadedObjects.empty();
  for(var key in tableList) {
    
    var vis_icon = '<span class="ui-icon ui-icon-check" onclick="showItem('+key+')"></span><span class="ui-icon ui-icon-blank"></span>';
    
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
  if(!tableList.includes(value)){tableList.push(value);}
  // console.log(tableList)
  updateObjectList();
  //groupDataByJob(value);
  
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
  var a = document.createElement('a');
  //a.href = Chart.getChart('myChart').toBase64Image("image/png", 1.0);
  a.href = document.getElementById('myChart').toDataURL('image/png');
  a.download = 'screenshot.png';
  a.click();
}
