
//var slider, timeStart, timeEnd; // slider and selected values for time - reset on file load

var rawData = []; // holds raw data rows as read in from SMF64
var gData = []; // holds data grouped by 
var gByDSN = []; // holds data grouped by DSN
var gByJob = []; // hodds data groubed by job for a specific DSN
var tableList = []; // List of selected tables, for reporting
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
        loaderId +=1;
        var reader = new FileReader(); 
        reader.addEventListener('loadstart', function() {
          //progressbar.show(); 
          progressBar[loaderId] = $('<div><div  class="progress-label">Loading:'+file.name+'</div></div>').progressbar({
            value: false,
          });
          $('#progressbars').append(progressBar[loaderId]).append($(''));
        });

        reader.addEventListener('progress', function(e){
          if (e.lengthComputable) {
            var progress = ((e.loaded / e.total) * 50);
            progressBar[loaderId].progressbar('value', progress);
            console.log(e.loaded+" "+e.total);
          }
        });
    
        reader.addEventListener('load', function(e) { 
          var header = e.target.result.split('\n').shift().replace(/\s/g, '');
          if( /R_JOB,R_DDN,R_DSN,R_DNM,EXCPS,INSERTS,DELETE,UPDATE,READS,RECCNT,RECLEN,DATABUF,INDXBUF,SID,DATE,HH:MM:SS/.test(header)){
            rawData = d3.csvParse(e.target.result, processRow);
            progressBar[loaderId].progressbar('value', 100);
            //console.log("100");
            processRawData();
          } else {
            alert("File format appears invalid");
          }
          
          setTimeout(removeItem(progressBar[loaderId]), 5000);
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
    var trimmedProp = origProp.trim();
    if (trimmedProp !== origProp) {
      d[trimmedProp] = d[origProp];
      delete d[origProp];
    }
 
  });
  var tDate = new Date(parseInt("20"+d.DATE.slice(0,2)), 0); 
  var doy = parseInt(String(d.DATE).slice(2));
  var t = d['HH:MM:SS'].split(':');
  var h=parseInt(t[0]); var m=parseInt(t[1]); var s=parseInt(t[2]); 
  tDate = new Date(tDate.setDate(doy));
  tDate = new Date(tDate.getYear(), tDate.getMonth(), tDate.getDay(), h, m, s, 0);
  d.timestamp = tDate;
  return{
      DATABUF: +d.DATABUF, 
      DATE: d.DATE, 
      timestamp: d.timestamp, 
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
  //console.log(gData);
  for (let [key, value] of gData){
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
    gByDSN.push(item);
  };
  console.log(gByDSN.sort((a,b)=> {return a.reads > b.reads ? -1:1}));
  $('#mainTable').DataTable().clear().rows.add(gByDSN).draw();
  // showDSNTable();
}

function groupDataByJob(DSN) {
  //console.log(DSN);
  //console.log(gData.get(DSN));
  var jData = d3.group(gData.get(DSN), d=>d.R_JOB);
  
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
    gByJob.push(item);
  };
  console.log(gByJob.sort((a,b)=> {return a.reads > b.reads ? -1:1}));
  $('#jobTable').DataTable().clear().rows.add(gByJob).draw();
  $('#jobTableHeader').text("Aggregated by Job for "+DSN);
  // showDSNTable();
}

function showDSNTable(){
  var maxSize = $('#maxSize');
  var regexInclude = $('#regexInclude');
  var regexExclude = $('#regexExclude');
  $('#applyFilters').click(function(){console.log("button clicked"); table.draw();});
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex){
    var size = parseFloat(maxSize.val());
    var tSize = parseFloat(data[4]) ||0;
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

    //console.log(data);
    //console.log(tbleSize+" >= "+size);
    return value;
  });
  
  var table = $('#mainTable').DataTable({
    buttons: [
            'print'
        ],
    data: gByDSN,
    columns: [
        { data: 'key', title: "DSN"},
        { data: 'reads' , title: "Reads"},
        { data: 'excps' , title: "EXCPS"},
        { data: 'changes', title: "Changes"},
        { data: 'instances', title: "Close Count"},
        //{ data: 'deletes' , title: "deletes"},
        //{ data: 'inserts' , title: "inserts"},
        //{ data: 'updates' , title: "updates"},
        { data: 'size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'earliest' , title: "From", render: d=>d.toLocaleString()},
        { data: 'latest' , title: "To", render: d=>d.toLocaleString()},
        //{ data: 'most' , title: "Max Row Count"},
    ],
  });

  var jobTable = $('#jobTable').DataTable({
    data: gByJob,
    columns: [
        { data: 'key', title: "JOB"},
        { data: 'reads' , title: "Reads"},
        { data: 'excps' , title: "EXCPS"},
        { data: 'changes', title: "Changes"},
        { data: 'instances', title: "Close Count"},
        //{ data: 'deletes' , title: "deletes"},
        //{ data: 'inserts' , title: "inserts"},
        //{ data: 'updates' , title: "updates"},
        { data: 'size' , title: "Largest Size (GB)", render: d=>d.toFixed(2)},
        { data: 'earliest' , title: "From", render: d=>d.toLocaleString()},
        { data: 'latest' , title: "To", render: d=>d.toLocaleString()},
        //{ data: 'most' , title: "Max Row Count"},
    ],
  });

  //maxSize.on('input', function (){
    //table.draw();
    //console.log("redraw");
  //})

  $('#mainTable tbody').on('click', 'tr', function () {
        var data = table.row(this).data();
        //alert('You clicked on ' + data['key'] + "'s row");
        addTableToList(data['key']);
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

function generateReport(){
  $('#report').empty();
  /**tableStats.forEach(function(item) {
    //var smallDiv = '<div class="Card"><p></p></div>';
    if(!item.hidden){
      var smallDiv = '<div class="card" name="'+item.label+'"><h2>'+item.label+'</h2>';
      smallDiv += '<p>This tables has an average read rate (per second) of '+item.accessRateAve+' which represents a MIP usage of '+item.accessRateAve/400+' to '+item.accessRateAve/100+'MIPS for the entire period of the graph. </p>';
      smallDiv += '<p>This tables has an peak read rate (per second) of '+item.accessRateMax+' which represents a MIP usage of '+item.accessRateMax/400+' to '+item.accessRateMax/100+'MIPS for the entire period of the peak. </p>';
      if(item.hasReorg){smallDiv += '<p>This table has been reorg\'d at somepoint, which may impact results.  This is indicated on the graph by a sloped line (due to  missing data point when the reorg occured).</p>';}
      smallDiv += '</div>';
      var pagebreak = '<div id="break" name="break" class="break" style="break-before: always;"></div>';
      var canvas = document.createElement('canvas');
      $('#report').append(smallDiv).append(canvas).append(pagebreak);
      var ctxs = canvas.getContext("2d");
      var chart =  new Chart(ctxs, {
                                type: 'line',
                                data: {}
                            });
      plotTable(ctxs, chart, tableStats.filter(function(el){ return el.id === item.id}));
    }
  }) **/
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
  groupDataByJob(value);
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
