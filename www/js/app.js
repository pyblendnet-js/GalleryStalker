/*jslint browser:true, devel:true, white:true, vars:true */
/*global $:false, intel:false app:false, dev:false, cordova:false */

/* By R.Parker 2016 http://grapevine.com.au/~wisteria/index.html or https://github.com/pyblendnet-js
     MIT licence included and applies also to app.js */

function onAppReady() {
    if( navigator.splashscreen && navigator.splashscreen.hide ) {   // Cordova API detected
        navigator.splashscreen.hide() ;
    }
    //console.log(Object.keys(window.AndroidFullScreen));
    window.AndroidFullScreen.isSupported(function() {
        console.log("Full screen support");
        hideUI();
    }, function() {
        console.log("Full screen is not supported");
        initApp();
    });
}

function showUI() {
  //window.StatusBar.show();
  window.AndroidFullScreen.isSupported(function() {
    window.AndroidFullScreen.showSystemUI(showUISuccess, errorFullScreen);
  },errorFullScreen);
}
    
function hideUI() {
  //window.StatusBar.hide();
  window.AndroidFullScreen.isSupported(function() {
    window.AndroidFullScreen.immersiveMode(hideUISuccess, errorFullScreen);
  },errorFullScreen);
}

function showUISuccess() {
    console.log("UI shown");
    setTimeout(configRtn,1000);  // gives system chance to respond
}

function hideUISuccess() {
    console.log("UI hidden");
    setTimeout(initApp,1000); // gives system chance to respond
}
    
//function successFullScreen() {
    //mobileLog("Fullscreen mode changed");
//}
    
function errorFullScreen() {
    mobileLog("Fullscreen mode change failed");
}

var mobileLog = console.log.bind(window.console); 
if(window.cordova === undefined) {
    window.addEventListener("load", initApp, false);  //document.add... is unreliable
    console.log("Onload listener added");
} else {
    mobileLog = consoleLogWrapper;  // comment this out when using intel XDK debugger
    document.addEventListener("app.Ready", onAppReady, false);
}

var pages = {};
var btns = {};  // btn elements on DOM
var menus = {};
var defaultBackImgPath = "img/SpiderMap.png";
var defaultSaverImgPath = "img/SpiderMap.png";
var backImgPath = defaultBackImgPath;
var saverImgPath = defaultSaverImgPath;
var lastTrackSavePath = "";
var backImg, saverImg;
var canvas3;
var saverMode = false;
var chosenImgDiv;
var listDiv, dialogDiv, profileDiv, saverDiv, contentDiv, paletDiv, stalkerDiv, debugLogDiv, pagesDiv;
var knobRadius = 5;
var paletDivs = [];
var profileData = {};
var paletteLookup = {};
var isCordova, isIE, hasLocalStorage;

var saveManual = 0;
var saveOnEveryTouch = 1;
var saveOnPaletteChange = 2;
var currentBackupMode = saveManual; 

var freeDrawLineMode = 0;
var continuousLineMode = 1;
var autoLineMode       = 2;
var segmentedLineMode  = 3;
var currentLineMode = freeDrawLineMode;

var noneLineStart = 0;
var dotLineStart  = 1;
var currentLineStart = noneLineStart;

var showAllLineLength = 0;
var showLast20LineLength = 1;
var showLast5LineLength = 2;
var showLineDot = 3;
var showNoLine = 4;
var currentLineLength = showAllLineLength;

var currentLine = [];
var currentTrack = [];
var currentTimes = [];
var baseTime = 0;
var touchDownTime = 0;
var firstTouch = false;
var saverLine = [];

var autoSaveStr = ["Manually","OnEveryTouch","OnPaletteChange"];
var lineModeStr = ["FreeDraw","Continuous","Auto","Segmented"];
var lineStartStr = ["None","Dot"];
var lineLengthStr = ["All","Last20","Last5","Dot","None"];

var currentListDirectory;
var saveTrackDirectory = null;
var loadTrackDirectory = null;
var loadImageDirectory = null;

function initApp() {
  console.log("Initialising application");
  console.log("Browser:" + navigator.appName);  // Netscape
  console.log("Platform:" + navigator.platform); // "Win32" on PC, "Linux i686" on PC and simulation
  console.log("Type of cordova:" + (typeof window.cordova));    
  isCordova = (window.cordova !== undefined);  //mobile app otherwise options only apply to web version
  isIE = (navigator.appName == 'Microsoft Internet Explorer');
  hasLocalStorage = (localStorage !== undefined);
  getConfig();  // loads preferences and image paths
  var menu_in = [["New",newBtnClick],
                ["LoadTrack",loadBtnClick,isCordova],
                ["LoadBackup",loadBackupBtnClick,hasLocalStorage],  // internet explorer has no local storage
                ["LineMode",changeLineMode,true,lineModeStr[currentLineMode]],
                ["LineStart",changeLineStart,!isIE,lineStartStr[currentLineStart]],  // IE has no SVG output
                ["LineLength",changeLineLength,true,lineLengthStr[currentLineLength]],
                ["BackgroundImage",selectBackgroundImg],
                ["ImagePathTextEntry",null],
                ["ScreenSaverImage",selectScreenSaverImg],
                ["LoadSaverNotes",loadSaverNotes,hasLocalStorage]
               ];
  var menu_out = [["BackupMode",changeBackupMode,hasLocalStorage,autoSaveStr[currentBackupMode]],
                  ["Save to local storage",saveBtnClick,hasLocalStorage],
                  //these options only apply to web version
                  ["Export to tab",exportToTab,!isCordova],
                  ["Export clipped to tab",exportClippedToTab,!isCordova],
                  ["Export to html tab",exportToHTMLTab,!isCordova],
                  ["Export to txt tab",exportToTxtTab,!isCordova],
                  ["Export track data to json tab",exportTracksToJsonTab,!isCordova],
                  ["Export profile data to json tab",exportProfileToJsonTab,!isCordova],
                  // this option only applies to mobile version
                  ["Save to device external storage",saveBtnClick,isCordova],
                  ["Show andoid UI",showUI,isCordova],
                  ["Reconfig Screen",configRtn]
                 ];
  var pgs = [['home','id_home_div'],
             ['menuIn','id_menu_in_div',null,menu_in],  // name, id, rtn_callback, menu, menustyle
             ['menuOut','id_menu_out_div',null,menu_out,"text-align:right"],
             ['debugConsole','id_debugConsole_div'],
             ['listItems','id_list_div'],
             ['profile','id_profile_div']
            ];
  loadPages('id_pages',pgs);
  goPage('home');
  contentDiv = document.getElementById('id_content_div');
  contentDiv.offsetHeight = window.innerHeight;
  backImg = document.getElementById("backImg");
  svgView = document.getElementById("svgView");
  paletDiv = document.getElementById('id_pallet_div');
  stalkerDiv = document.getElementById('id_stalker_div');
  stalkerDiv.addEventListener("click",showProfile);
  debugLogDiv = document.createElement("div");
  debugLogDiv.style.height = (window.innerHeight-60) + "px";
  debugLogDiv.style.overflow = "auto";
  pages.debugConsole.appendChild(debugLogDiv);
  profileDiv = document.createElement("div");
  pages.profile.appendChild(profileDiv);
  listDiv = document.createElement("div");
  listDiv.innerHTML = "Files found";
  pages.listItems.appendChild(listDiv);
  saverImg = document.getElementById("saverImg");
  saverDiv = document.getElementById("saverDiv");
  canvas3=document.getElementById("canvas3");
  ctx3= canvas3.getContext("2d");
  	
 
  dialogDiv = document.createElement("div");
  dialogDiv.className = "popup";
  document.getElementsByTagName("body")[0].appendChild(dialogDiv);

  // setup storage paths    
  if(window.cordova !== undefined) { // setup external directories
    if(cordova.file !== undefined)
        currentListDirectory = cordova.file.externalRootDirectory;
    else
        currentListDirectory = "cordova_sim";
    if(hasLocalStorage) {
      saveTrackDirectory = localStorage.getItem("saveTrackDirectory");
      loadTrackDirectory = localStorage.getItem("loadTrackDirectory");
      loadImageDirectory = localStorage.getItem("loadImageDirectory");
    }
    if(saveTrackDirectory === null) {
      saveTrackDirectory = currentListDirectory;
    }
    if(loadTrackDirectory === null) {
        loadTrackDirectory = currentListDirectory;
    }
    if(loadImageDirectory === null) {
        loadImageDirectory = currentListDirectory;
    }
    mobileLog("saveTrackDirectory:"+saveTrackDirectory);
    mobileLog("loadTrackDirectory:"+loadTrackDirectory);
    mobileLog("loadImageDirectory:"+loadImageDirectory);
    attemptToLoadBackImg();
    attemptToLoadSaverImg();
  } else {
    backImg.setAttribute("src",backImgPath);
    saverImg.setAttribute("src",saverImgPath);
    //saverImg.style.display = "none";
    configureCanvas();    // assumes the back image is in the app img path
  }

  var bs = [{ id:"id_menu_in_btn", click:menuInClick },
            { id:"id_title_btn", click:titleClick },
            { id:"id_menu_out_btn", click:menuOutClick }];
  bs.forEach(function(btn) {
    btns[btn.id] = document.getElementById(btn.id);
    if(btn.hasOwnProperty("click"))
      btns[btn.id].addEventListener("click",btn.click);
  });
  var ts;    
  if(isCordova) {
        ts = [  ["touchstart", touchStart],
                ["touchmove", touchMove],
                ["touchend", touchEnd],
                ["touchcancel", touchCancel]];
  } else {
        ts = [  ["mousedown", mouseDown],
                ["mousemove", mouseMove],
                ["mouseup", mouseUp],
                ["mouseleave", mouseLeave]];
  
  }
  ts.forEach(function(te) {
            contentDiv.addEventListener(te[0], te[1], false);
        });
  ts.forEach(function(te) {
            saverDiv.addEventListener(te[0], te[1], false);
        });
  //console.log("Event listeners added");
  menus.BackgroundImage.innerHTML += '= ' + '<span id="id_chosen_img">' + backImgPath + '</span>';
  menus.ScreenSaverImage.innerHTML += '= ' + '<span id="id_chosen_saver_img">' + saverImgPath + '</span>';
  menus.ImagePathTextEntry.style.display = "none";  // hide this entry
  var pb = [["red","#c22"],
            ["yellow","#cc2"],
            ["green","#2c2"],
            ["cyan","#2cc"],
            ["blue","#22c"],
            ["violet","#c2c"],
            ["gray","#888"]
           ];    //["black","#000"]
		//border:2px dashed #fff;
  // set pallet box
  var remainder = window.innerWidth;
	pb.forEach(function(pc) {
    var b = document.createElement("div");
    b.className = "palette-box";
    var bp = document.createElement("div");
    bp.style.background = pc[1];
    addClickNHold(bp,onPalletClick,onPalletHold);
    bp.className = "palette";
    b.appendChild(bp);
    paletDivs.push(bp);  // needed for hide select
    paletDiv.appendChild(b);
    remainder -= 60;
    if(pc[1] == currentTrackColor) {
      selectedPalette = bp;
      bp.style.borderColor = "#fff";
	  bp.style.borderStyle = "dashed";
      currentTrackColor = bp.style.backgroundColor;
    } 
    //profileData[pc[0]] = {};  // initialise profile for each color
    paletteLookup[bp.style.backgroundColor] = pc[0];
  });
  // add undo delete and redo buttons
  var sp = [["undo.png",onUndoClick],
            ["delete.png",onDeleteClick],
            ["redo.png",onRedoClick],
            ["help.png",showHelp],
           ];
  if(isCordova)
    sp.push(["save.png",saveNow]);
 
  sp.forEach(function(sa){    
    var b = document.createElement("div");
    b.className = "palette-box";
    var bp = document.createElement("div");
    bp.addEventListener("click",sa[1]);
    bp.className = "palette";
    var ip = document.createElement("img");
    ip.src = "img/" + sa[0];
    ip.style.width = "100%";  // 100% of the containing pallet class which is 36px
    ip.style.height = "100%";
    bp.appendChild(ip);
    //console.log("button img src=" + ip.src + " style:" + ip.style);
    bp.style.borderColor = "#000";
	bp.style.borderStyle = "solid"; 
    b.appendChild(bp);
    paletDiv.appendChild(b);
    remainder -= 60;
  });
  var alt_div = document.createElement("div");
  alt_div.className = "palette-box";
  alt_div.style="height:36px";
  alt_div.addEventListener("click",showAlternate);
  alt_div.style.width = remainder + 'px';
  var aip = document.createElement("img");
  aip.src = "img/pencil.png";
  //ip.style.width = "100%";  // 100% of the containing pallet class which is 36px
  aip.style.height = "100%";
  alt_div.appendChild(aip);
  paletDiv.appendChild(alt_div);
}

function attemptToLoadBackImg() {
    if(backImgPath.indexOf(currentListDirectory) === 0) {  // the img path is built on the external storage path
      loadImgFromName(backImgPath,parseBackImg,configureCanvas,function() {
        // this is the fail option to known good image  
        backImgPath = defaultBackImgPath;
        backImg.setAttribute("src",backImgPath);
        configureCanvas();
      });
    } else {  // try to find image in app img path
      try {    
        backImg.setAttribute("src",backImgPath);
      } catch(e) {
          mobileLog("Error loading " + backImgPath + " : " + e);
      }
      configureCanvas();  
    }
}

function attemptToLoadSaverImg() {
    if(saverImgPath.indexOf(currentListDirectory) === 0) {  // the img path is built on the external storage path
      loadImgFromName(saverImgPath,parseSaverImg,null,function() {
        // this is the fail option so load a known safe image instead
        saverImgPath = defaultSaverImgPath;
        saverImg.setAttribute("src",saverImgPath);
      });
    } else {
      try{    
        saverImg.setAttribute("src",saverImgPath);  // path is not an external path
      } catch(e) {
          mobileLog("Error loading " + saverImgPath + " : " + e);
      }
    }
}

function getConfig() {
  if(!hasLocalStorage)   // IE has no localstorage
    return;
  try {
    // get last used image
    var imgPath = localStorage.getItem("backImgPath");
    if(imgPath !== null && imgPath.length > 0) {
      backImgPath = imgPath;
    }
    imgPath = localStorage.getItem("saverImgPath");
    if(imgPath !== null && imgPath.length > 0) {
      saverImgPath = imgPath;
    }
    console.log("Background Image Path:" + backImgPath);
    console.log("Saver Image Path:" + saverImgPath);
    var optionstr = localStorage.getItem("options");
    if(optionstr !== null) {
      var options = JSON.parse(optionstr);
      console.log("OPTIONS:" + JSON.stringify(Object.keys(options)));
      currentBackupMode = options.backupMode;
      currentLineMode = options.lineMode;
      currentLineStart = options.startMode;
      currentLineLength = options.lengthMode;
    }
  } catch(e) {
    console.log("Error loading options:" + e);
  }
}

function setConfig() {
  if(!hasLocalStorage) // IE has no localstorage
    return;
  try {
    // get last used image
    localStorage.setItem("backImgPath",backImgPath);
    localStorage.setItem("saverImgPath",saverImgPath);
    var options = {backupMode:currentBackupMode,lineMode:currentLineMode, startMode:currentLineStart, lengthMode:currentLineLength };
    //console.log("OPTIONS:" + JSON.stringify(options));
    localStorage.setItem("options",JSON.stringify(options));
  } catch(e) {
    console.log("Error setting options:" + e);
  }
}


var btnMouseDownTm;
var clickNHoldBtns = [];

function clickNHoldClick(div) {
  //console.log("Click:" + div.style.backgroundColor);
  clickNHoldBtns.forEach(function(btn) {
    //console.log(btn.el.backgroundColor);
    if(btn.el === div) {
      console.log("Button click");
      btn.click(div);
      return;
    } 
  });
}

function clickNHoldHold(div) {
  console.log("Hold:" + div.style);
  clickNHoldBtns.forEach(function(btn) {
    if(btn.el === div) {
      console.log("Button hold");
      btn.hold(div);
      return;
    } 
  });
}

function btnMouseDown(e) {
  //console.log("Button mouse down");
  btnMouseDownTm = Date.now();
  e.preventDefault();
}

function btnMouseUp(e) {
  var dt = Date.now() - btnMouseDownTm;
  console.log("Button mouse up dt=" + dt);
  if(dt > 1000)  // 1 second has passed
    clickNHoldHold(this);
  else
    clickNHoldClick(this);
  e.preventDefault();
}

function addClickNHold(bp,click,hold) {
  if(isCordova) {
    bp.addEventListener("touchstart", btnMouseDown);  // not a mistake as both functions identical
    bp.addEventListener("touchend", btnMouseUp);
  } else {
    bp.addEventListener("mousedown",btnMouseDown);
    bp.addEventListener("mouseup",btnMouseUp);
  }
  clickNHoldBtns.push({el:bp,click:click,hold:hold});  // element, click call, hold call
  // bp.addEventListener("click",onPalletClick);
  //console.log("Click and hold buttons:" + clickNHoldBtns.length);
} 

function loadPages(pgs_id,pgs) {
  pagesDiv = document.getElementById(pgs_id); 
  pgs.forEach(function(pg) {
    console.log("Adding page:" + pg[0] + " with id:" + pg[1]);
    var pgdiv = document.getElementById(pg[1]);
    if(pgdiv === null) {
      console.log("No " + pg[1] + " yet");
      pgdiv = document.createElement("div");
      pgdiv.id = pg[1];
      pgdiv.className = "page";
      pagesDiv.appendChild(pgdiv);
    } else {
      console.log(pg[1] + " found");
      //console.log(pgdiv.outerHTML);
    }
    //pgdiv.style.display = "none";
    pages[pg[0]] = pgdiv;
    if(pg[0] != "home") {  // so header is return path
      console.log("Adding return button");
      var rtnbtn = document.createElement("span");
      rtnbtn.innerHTML = "Return to home page";
      rtnbtn.className = "header full btn";
      if(pg.length >2 && pg[2] !== null)
        rtnbtn.addEventListener("click",pg[2]);
      else
        rtnbtn.addEventListener("click",rtnClick);
      if(pgdiv.childNodes.length > 0) {
        console.log("Has " + pgdiv.childNodes + " existing nodes");
        pgdiv.insertBefore(rtnbtn,pgdiv.childNodes[0]);
      } else
        pgdiv.appendChild(rtnbtn);
    }
    if(pg.length > 3) {
      loadMenu(pg[3],pgdiv,pg[4]);
    }
  });
}

function loadMenu(menu,menu_div,style) {
  // each item in menu array can have:
  // title, action, [conditional inclusion], [current setting], [style]
  console.log("Menu style:" + style);
  menu.forEach(function(mi) {
    if(mi.length > 2) {
      if(!mi[2])  // conditional inclusion
        return;
    }
    var mb = document.createElement("div");
    console.log("Adding menu item:" + mi[0]);
    menus[mi[0]] = mb;  // assumes all menus are unique
    mb.innerHTML = mi[0];
    if(typeof mi[1] === 'function')
      mb.addEventListener("click",mi[1]);
    mb.className = "menu";
    if(typeof style == 'string') {
      console.log("menu has style " + style);
      loadStyle(mb,style);  // group menu style
    }
    if(mi.length > 3) {
      if(mi[3] !== null)
        mb.innerHTML = mi[0] + " = " + mi[3];
      if(mi.length > 4) {
        console.log("menu item " + mi[0] + " has style " + mi[4]);
        loadStyle(mb,mi[2]);
      }
    }
    menu_div.appendChild(mb);
  });
}
// ...additional event handlers here...

    function consoleLogWrapper(msg) {   //if this is a mobile app then mobileLog will bind to this
      var ln = document.createElement("div");
      ln.innerHTML = msg;
      debugLogDiv.appendChild(ln);
      //console.log(msg);
      //debugLogDiv.innerHTML += "<p>" + msg + "</p>";
      if(debugLogDiv.childNodes.length > 100)
        debugLogDiv.removeChild(debugLogDiv.childNodes[0]);
    }
        
    function titleClick() {  
       pages.home.style.display = "none";
       pages.debugConsole.style.display = "block";
    } 

    function goPage(pg) {
      var pgk = Object.keys(pages);
      pgk.forEach(function(pk) {
        if(pk == pg)
          pages[pk].style.display = 'block';
        else
          pages[pk].style.display = 'none';
      });
    }

    function rtnClick() {
       console.log("Return to home screen"); 
       goPage('home'); 
    } 

    function menuInClick() {
      goPage('menuIn');
    }          

    function menuOutClick() {
      goPage('menuOut');
    } 

    var selectedPalette = null;         

    function onPalletClick(el) {
      //console.log("el:" + typeof el);
      //console.log(JSON.stringify(el));
      el = el || this;
      //console.log("el:" + typeof el);
      //console.log(JSON.stringify(el));
      if(selectedPalette) {
        selectedPalette.style.borderColor = "#777";
	      selectedPalette.style.borderStyle = "solid";
      } 
      el.style.opacity = 1.0;
      if(el !== selectedPalette) {
		    el.style.borderColor = "#fff";
		    el.style.borderStyle = "dashed";
        newLine();  // save any current lines
		    currentTrackColor = el.style.backgroundColor;
		    selectedPalette = el;
      } else {
        selectedPalette = null;
      }
      trackToScreen();
      if(currentBackupMode === saveOnPaletteChange)
        saveTrackLocal();
    }

    function onPalletHold(el) {
      el = el || this;
      //console.log("Pallet hold");
      toggleDivOpacity(el);
      trackToScreen();
    }

    function toggleDivOpacity(el) {
      var op = el.style.opacity;
      console.log("Op:" + op);
      console.log("TypeOp:" + (typeof op));
      if(op === "")  // first use before it has been set
        el.style.opacity = 0.2;
      else if(op == 1.0)
        el.style.opacity = 0.2;
      else
        el.style.opacity = 1.0;
    }

    var redoTrack = [];   // for redo of tracks that are undone
    var redoLine = [];    // for redo of lines
    var redoTimes = [];
    var deleteTimes = [];  // last point deleted times can be reused

    function onUndoClick() {
      undo(false);
    }

    function undo(destructive) {
      if(currentLine.length > 0) { // current line holds at least one point
        console.log("undo currentline length:" + currentLine.length);
        if(destructive) {
          currentLine.pop();
          currentTimes.pop();
        } else {
          redoLine.push(currentLine.pop());
          redoTimes.push(currentTimes.pop());
        }
      }
      if(currentLine.length === 0) {  // no more points left in current line
        if(currentTrack.length > 0) {  // there are more lines
          var t = currentTrack[currentTrack.length-1];
          if(isColorHidden(t.color)) {  // track belongs to a different color than current
            window.alert("Cannot undo further back while palette is selected.");
            return;  // can only undo what is visible
          }
          redoTrack.push({line:redoLine,times:redoTimes,color:currentTrackColor});
          var track = currentTrack.pop();
          currentLine = track.line;
          currentTimes = track.times;
          currentTrackColor = track.color;  // even though no palette is selected
          redoLine = [];
          redoTimes = [];
        }
      } 
      trackToScreen();
    }

    function onDeleteClick() {
      undo(true);
    }

    function onRedoClick() {
      console.log("Redo click");
      //if(currentLineMode == continuousLineMode || currentLineMode === freeDrawLineMode) {
      if(redoLine.length === 0) {
        console.log("Redo segments:" + redoTrack.length);
        if(redoTrack.length > 0) {
          var t = redoTrack[redoTrack.length-1];
          console.log(t);
          if(isColorHidden(t.color)) {
            window.alert("Cannot redo this palette");
            return;  // can only redo what is visible
          }
          newLine();  // push anything in currentLine into a track
          var track = redoTrack.pop();
          redoLine = track.line;
          redoTimes = track.times;
          currentTrackColor = track.color;
        }
      }
      if(redoLine.length > 0) {
        currentLine.push(redoLine.pop());
        currentTimes.push(redoTimes.pop());
      }
      trackToScreen();
    }
        
// Cordova is loaded and it is now safe to make calls Cordova methods
function onDeviceReady() {
  navigator.splashscreen.hide();
}
	
var ctx1, ctx2, ctx3, svgView, currentTrackColor = "#c22", x = 0, y = 0, z = 0, etch = 0;	

        
function newBtnClick() {
  mobileLog("new clicked");
  //$("#confirmSavePopupDiv").popup("open");
  newCanvas();
  rtnClick();  
}

function loadBackupBtnClick() {
  mobileLog("load backup clicked");
  //console.log("Platform:" + navigator.platform);
  var svg_data = localStorage.getItem("svgData");
  if(svg_data === null) {
      alert("No backup data was found");
  }
  var js = atob(svg_data);
  mobileLog("Loaded:" + js);    
  var record = JSON.parse(js); 
  currentTrack = record.track;
  if(record.hasOwnProperty("profile"))
    profileData = record.profile;
  scaleTrack(currentTrack,backImg.height/record.height);  // adjust for img variation
  trackToScreen();
  rtnClick();
}

function loadBtnClick() {
  mobileLog("load clicked");
  //console.log("Cordova present so cordova file system");
  currentListDirectory = loadTrackDirectory;  
  fileSelector(false,"svg","Select track file to load:",loadTrackSelected,"",finiLoadTrack);
}

function scaleTrack(track,scale) {
	if(scale == 1.0)
    return;
  for(var i = 0; i < currentTrack.length; i++) {
    for(var j = 0; j < currentTrack[i].line.length; j++) {
      for(var k = 0; k < 2; k++) {  // do the x and y value
        currentTrack[i].line[j][k] *= scale;
      }
    }
  }
}

var lastListFilesOnSuccess = null;
var lastListFilesOnFailure = null;
var currentDirEntry = null;
var fileList = [];

function loadImgFromName(pth,image_parser,on_success,on_failure) {
    // called if isCordova and path indicates external storage
    mobileLog("Attempting to load image " + pth);
    var i = pth.lastIndexOf("/");
    var file_name = pth.substring(i+1);
    currentListDirectory = pth.substring(0,i);
    console.log("directory:" + currentListDirectory + " filename:" + file_name + " i=" + i);
    if(cordova.file.externalRootDirectory === null) {
        var msg = "Error: No external root directory defined";  //should not be here in the first place
        mobileLog(msg);
        if(on_failure)
          on_failure(msg);
        return;
    }
    console.log("Resolving storage location:" + currentListDirectory);
    window.resolveLocalFileSystemURL(currentListDirectory,function(dir) {
        mobileLog("Full path:" + dir.fullPath);
        //web path(or URL) to the application storage directory
        mobileLog("URL:" + dir.toURL());
        currentDirEntry = dir;
        readFile(file_name,image_parser,"dataURL",on_failure);  // imageParser was set in onBrowseBackgroundImg(()
        if(on_success)
          on_success();
    },function(error) { 
        window.alert("Failed to resolve:" + currentListDirectory);
        currentListDirectory = cordova.file.externalRootDirectory;
        on_failure("Directory error");
    });
}

function listFiles(on_success,on_failure) {  //directory change may call recursive call
    if(on_failure === undefined)
        on_failure = lastListFilesOnFailure;
    else
        lastListFilesOnFailure = on_failure;
    if(on_success === undefined)
        on_success = lastListFilesOnSuccess;
    else
        lastListFilesOnSuccess = on_success;
    currentDirEntry = null; // incase things go pair shape, leave this nulled
    var lst = [];
    if(cordova.file.externalRootDirectory === null) {
        var msg = "Error: No external root directory defined";
        mobileLog(msg);
        on_failure(msg);
    }
    if(currentListDirectory != cordova.file.externalRootDirectory)
        lst.push(["..","background-color:#8F8",goParentDirectory]);
    console.log("Resolving storage location:" + currentListDirectory);
    window.resolveLocalFileSystemURL(currentListDirectory,function(dir) {
        mobileLog("Full path:" + dir.fullPath);
        //web path(or URL) to the application storage directory
        mobileLog("URL:" + dir.toURL());
        currentDirEntry = dir;
        var directoryReader = currentDirEntry.createReader();
        //now read the contents using the readEntries function.
        directoryReader.readEntries(function(entries){
                var i;
                for (i=0; i<entries.length; i++)
                {
                    var e= entries[i];
                    fileList.push(e.name); //required to avoid double ups
                    var lst_item = [e.name];
                    if(e.isDirectory) {
                        lst_item.push("background-color:#CCF");
                        lst_item.push(enterDirectory);
                    } else if(e.isFile) {
                        lst_item.push("background-color:#FCC");
                    } else {
                        lst_item.push("background-color:#FFF");
                    }
                    lst.push(lst_item);
                    mobileLog("Found:" + e.name);
                    if(i === 0)
                    mobileLog("An entry has keys:" + Object.keys(e)); //isFile,isDirectory,name,fullPath,filesystem,nativeURL
                }
                console.log("File count:" + lst.length);
                on_success(lst);
            },function(error){
                mobileLog("Failed to list directory contents. Error code is: " + error.code);
                on_failure("File error");
            });
    },function(error) { 
        window.alert("Failed to resolve:" + currentListDirectory);
        currentListDirectory = cordova.file.externalRootDirectory;
        on_failure("Directory error");
    });
}

function enterDirectory() {
    mobileLog("List directory:" + this.innerHTML);
    currentListDirectory += "/" + this.innerHTML;
    mobileLog("New directory list:" + currentListDirectory);
    listFiles();
}

function goParentDirectory() {
    mobileLog("List directory:" + this.innerHTML);
    var cp = currentListDirectory.lastIndexOf("/");
    currentListDirectory = currentListDirectory.slice(0,cp);
    mobileLog("New directory list:" + currentListDirectory);
    listFiles();
}

function fileSelector(save_mode,filter,prompt,select_click,init_value,final) {
    //console.log("File selector");
    // add here the cordova file system directory listing
    /* test code:
      var test_list =[["test1"],["test2","background-color:#444"],["test3"]];
      comment following line and function return at bottom
    */  
    //var test_list = 
    listFiles(function(lst) {
      //console.log("File selected ready");
      var action_div = document.createElement("div");    
      action_div.style.marginTop = "10px";    
      if(save_mode) {
          console.log("Save mode");
        showList(lst,prompt,function(){
          tf.innerHTML = this.innerHTML; // item in list clicked so update text field
        });
        var tf = addTextField(action_div,init_value,"File name:");  
        addOkCancel(action_div,function() {
          select_click(tf.innerHTML);
          },rtnClick);
        addButton(action_div,"NewDirectory",newDirectory);
        listDiv.appendChild(action_div);    
      } else {
        showList(lst,prompt,select_click);
        addButton(action_div,"Cancel",rtnClick);
        listDiv.appendChild(action_div);    
      }
    },function(msg) {
      listDiv.innerHTML = '<p>' + msg + '</p>';
      if(typeof final === 'function')    
        final();    
    });
}

function showList(items,prompt,item_click) {
    console.log("Show list");
    listDiv.innerHTML = "<div>"+ prompt+"</div>";
    var listbox = document.createElement('div');
    listbox.className = "listbox";
    //listbox.style = "background-color:#770"; // height:50%; overflow:auto";  // css overflow no work
    listbox.style.height = (window.innerHeight-100) + "px";
    console.log(listbox.style.height);
    listDiv.appendChild(listbox);
    items.forEach(function(fid) {
      var item_div = document.createElement("div");
      item_div.innerHTML = fid[0];  // first value is text content
      item_div.className = "listitem";
      // need to color directories
      listbox.appendChild(item_div);
      if(fid.length > 1) {
        //console.log("Found style value:" + fid[1]);
        loadStyle(item_div,fid[1]);
      }
      if(fid.length > 2) {
        item_div.addEventListener("click",fid[2]);  // custom click call - ie enterDirectory 
      } else
        item_div.addEventListener("click",item_click);
    });
    goPage('listItems');
}

function loadStyle(div,style_str) {
  var sty = style_str.split(" ");
  sty.forEach(function(st){
    var s = st.split(":");
    div.style[s[0]] = s[1];
  });
}

function loadTrackSelected() {
  var fid = this.innerHTML;
  mobileLog("Selected:" + fid);
  //console.log("Has style:" + this.style);
  // need to check color for directories
  // add here cordova file system recovery
  if(currentDirEntry) {
      readFile(this.innerHTML,parseSvg);
  }  // don't know how we could get here without
  rtnClick();
  finiLoadTrack();
}

function finiLoadTrack() {
  loadTrackDirectory = currentListDirectory ;  
  localStorage.setItem("loadTrackDirectory",currentListDirectory);
}

function saveBtnClick() {
  saveTrack();
}

function saveNow() {
    mobileLog("save to last destination:" + lastTrackSavePath);
    if(lastTrackSavePath.length > 0)
      saveTrackSelected(lastTrackSavePath);
    else
      saveTrack();
}

function saveTrack() {
  console.log("Save clicked");    
  if(window.cordova === undefined ) {
    saveTrackLocal();  
  } else {  // android or ios on intelXDK
    console.log("Cordova present so cordova file system");
    if(selectedPalette !== null) {
      if(!window.confirm("Only one palette selected. Click okay to save only that palette track."))
        return;
    }
    if(areSomePalettesHidden()) {
      if(!window.confirm("Some palettes are hidden. Click okay to save with those palettes excluded."))
        return;
    }
    currentListDirectory = saveTrackDirectory;
    fileSelector(true,"svg","Select location to save:",saveTrackSelected,"track"+Date.now()+".svg",finiSaveTrack);
  }
}

function saveTrackLocal() {
  tempTrack(); // to add currentLine to currentTrack
  var js = JSON.stringify({track:currentTrack,profile:profileData,width:backImg.width,height:backImg.height});
  //console.log("Saved:" + js);
  localStorage.setItem("svgData",btoa(js));
  unTempTrack();
  rtnClick();
}

function saveTrackSelected(fid) {
  console.log("Save track to:" + fid);
  // implement cordova file save here
  if(!currentDirEntry)
      return;  // don't know how this could happen
    console.log("Got ");
  tempTrack(); // to add currentLine to currentTrack
  if(currentTrack.length === 0) {
      window.alert("No tracks to save");
  } else {
      writeFile(fid,createSvgTxt(false, false));
      lastTrackSavePath = fid;
  } 
  unTempTrack();
  rtnClick();    
  finiSaveTrack();    
}

function finiSaveTrack() {
   saveTrackDirectory = currentListDirectory;
   localStorage.setItem("saveTrackDirectory",currentListDirectory);
}

function readFile(file_name,parser,readas,on_failure) {
  if(!currentDirEntry)
    return;  // don't know how this could happen
  console.log("Attempting to read:" + file_name);
  currentDirEntry.getFile(file_name, {create: false, exclusive: false}, function(fileEntry){
    //lets read the content of the file.
    console.log(fileEntry);
    fileEntry.file(function(file){
        console.log(file);
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            //result property is string type if you read data as string. If you read data as array buffer then its assigned to a array buffer object.
            //mobileLog("Read:" + evt.target.result);
            parser(evt.target.result);
          };
        //to read the content as binary use readAsArrayBuffer function.
        if(readas === undefined || readas == "text")
            reader.readAsText(file);
        else if(readas == "dataURL") 
            reader.readAsDataURL(file);
        else
            reader.readAsBinaryString(file);
    }, function(error){
        mobileLog("Error occurred while reading file:" + file_name + ". Error code is: " + error.code); 
        if(on_failure !== undefined)
            on_failure();
    });
  },function(error){
        mobileLog("Error occurred while getting a pointer to file:" + file_name + ". Error code is: " + error.code);  
        if(on_failure !== undefined)
            on_failure();
  });
}

function writeFile(file_name,data) {
   if(!currentDirEntry)
     return;  // don't know how this could happen
   currentDirEntry.getFile(file_name, {create: true, exclusive: false}, function(fileEntry){
                //lets write something into the file
                fileEntry.createWriter(function(writer){
                    writer.write(data);
                }, function(error){
                    mobileLog("Error occurred while writing to file. Error code is: " + error.code);
                });
          }, function(error){
                mobileLog("Error occurred while getting a pointer to file:" + file_name + ". Error code is: " + error.code);
          });     
}

function newDirectory() {
    mobileLog("Chose new directory");
 /* This shows how to make a dialog box but wondow.prompt is much easier
    var df = addTextField(dialogDiv,"NewDirectory","New directory name:");
    console.log("dd=" + dialogDiv.innerHTML);
  addOkCancel(dialogDiv,function() {
    createDirectory(df.innerHTML);
    closeDialog();  
    },closeDialog());
    openDialog();
    console.log("df=" + dialogDiv.innerHTML);
    //console.log("body:"+ document.getElementsByTagName("body")[0].innerHTML);
*/
    var nd = window.prompt("Enter name of new directory:","NewDirectory");
    if(nd)
        createDirectory(nd);
}

function openDialog() {
  dialogDiv.style.display = "block";
}

function closeDialog() {
  dialogDiv.style.display = "none";  
}

function createDirectory(new_directory_nm) {
    if(fileList.indexOf(new_directory_nm) >= 0) {
        window.alert("Directory already exists");
        return;
    }
    // only entry here if currentDirEntry is already resolved 
    if(!currentDirEntry)
        return;  // don't know how this could happen
  currentDirEntry.getDirectory(new_directory_nm, {create: true, exclusive: false}, function(dir_new){
                //for any operation inside this directory use dir_new object.
            }, function(error){
                mobileLog("Error occurred while getting pointer to new directory. Error code is: " + error.code);
            });
}

function configRtn() {
    configureCanvas();
    rtnClick();
}
             
// function to setup a new canvas for drawing
function configureCanvas(){
    currentTrack = [];
    currentLine = [];
    currentTimes = [];
    baseTime = 0;
	//define and resize canvas
    console.log("Window height:" + window.innerHeight);
    var h = window.innerHeight-100;
    var w = window.innerWidth;
    console.log("window inner W" + w + " H:" + h);
    console.log("top:" + contentDiv.offsetTop);
    console.log("pallet height:" + paletDiv.clientHeight);

    var ih = backImg.clientHeight;
    var iw = backImg.clientWidth;
    //console.log("image W" + iw + " H:" + ih);

    var wr = w/h;
    var ir = iw/ih;
    //console.log("wr:" + wr + " ir:" + ir);
    if(ir > wr)
      h *= wr / ir;
      

  contentDiv.style.height = h + 'px';  
    // setup canvas
	var canvas1=document.getElementById("canvas");
  ctx1= canvas1.getContext("2d");
	ctx1.strokeStyle = currentTrackColor;
	ctx1.lineWidth = 5;
    
  var canvas2=document.getElementById("canvas2");
  ctx2= canvas2.getContext("2d");
	ctx2.strokeStyle = currentTrackColor;
	ctx2.lineWidth = 5;	

  var commons = [backImg,svgView,canvas1,canvas2];
  //console.log(typeof commons);
  commons.forEach( function(el) {
    el.setAttribute("height",h + "px");
    if(el != backImg)
      el.setAttribute("width",w + "px");
    el.setAttribute("style.top",contentDiv.offsetTop + "px");
    });
    
  // test remnant svgView.innerHTML = '<circle cx="200" cy="250" r="25" style="stroke: none; fill: #0000ff;" />';
  //console.log(contentDiv.innerHTML);
}
    
var x0,y0, x1,y1;
var canvasPosition;
var dragged = false;

        
function drawStart(x,y) {
  x0 = x;
  y0 = y;
  if(saverMode) {
    return;
  }
  y0 -= contentDiv.offsetTop;
  touchDownTime = Date.now();
  firstTouch = true;
  if(currentLineMode === continuousLineMode) {  //otherwise needs to wait till mouse up to see if drag occurred
    currentLine.push([x0,y0]);
    if(deleteTimes.length > 0) {
      currentTimes.push(deleteTimes.pop());  // this is a line redo
    } else {
      if(baseTime === 0)
        baseTime = Date.now();
  	  currentTimes.push(touchDownTime-baseTime);
    }
    if(currentLine.length > 0)
      trackToScreen();  // assume this was joining on to previous 
  }
} 

function newCanvas() {
  if(!confirm("This will erase all tracks and profiles. Are you sure?")) return;
  ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
  svgView.innerHTML = "";
  currentLine = [];
  currentTrack = [];
  currentTimes = [];
  baseTime = 0;
  //for(var k in profileData)
  //  profileData[k] = {};
  profileData = {};
  lastTrackSavePath = "";
}
        
var minSketchDelta = 5;

function drawMove(x,y) {
  if(saverMode) {
    if(Math.abs(x0- x) > minSketchDelta || Math.abs(y0- y) > minSketchDelta) {
      saverLine.push([x0,y0,x,y]);
      ctx3.beginPath();
      ctx3.moveTo(x0,y0);
      ctx3.lineTo(x,y);
      ctx3.stroke();
      x0 = x;
      y0 = y;
    }
    return;
  }
  y -= contentDiv.offsetTop;
  if(currentLineMode === freeDrawLineMode) {
    var dx = Math.abs(x - x0);
    var dy = Math.abs(y - y0);
    var d2 = dx*dx + dy*dy;
    if(d2 > 400) {  // make a new line from here
      //console.log("D2=" + d2);
      if(firstTouch) {
        newLine();
        currentLine.push([x0,y0]);
        if(deleteTimes.length > 0) {
          currentTimes.push(deleteTimes.pop());  // this is a line redo
        } else {
          if(baseTime === 0)
            baseTime = touchDownTime;
      	  currentTimes.push(touchDownTime-baseTime);
        }
      }
      firstTouch = false;
      dragged = true;
      drawEnd(x,y + contentDiv.offsetTop);  // continuous simulated draw end (note: contentDiv.offsetTop is subtracted in drawEnd
      x0 = x;
      y0 = y;
      return false;
    }
  }
  ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
  ctx2.beginPath();
  ctx2.moveTo(x0,y0);
  ctx2.lineTo(x,y);
  ctx2.stroke();
  x1 = x;
  y1 = y;
  return true;
}

var svgBounds = { extremes:[0,0,0,0], height:0, width: 0 };

function checkBounds(bounds,pnt) {
  //console.log("Checking pnt:" + pnt[0] + "," + pnt[1])
  bounds.extremes[0] = Math.min(pnt[0],bounds.extremes[0]);
  bounds.extremes[1] = Math.min(pnt[1],bounds.extremes[1]);
  bounds.extremes[2] = Math.max(pnt[0],bounds.extremes[2]);
  bounds.extremes[3] = Math.max(pnt[1],bounds.extremes[3]);
  bounds.width = bounds.extremes[2] - bounds.extremes[0];
  bounds.height = bounds.extremes[3] - bounds.extremes[1];
  //console.log("Max:" + bounds.extremes[2] + "," + bounds.extremes[3]);
}
        
function lineToSVG(ln,col,meta) {
  if(ln.length === 0)
    return;
  var svgStr = '<polyline points="';
  for(var i = 0; i < ln.length; i++) {
    p = ln[i];
    //log(p);
    //log(svgStr);  
    checkBounds(svgBounds,p);
    try {
    svgStr += ' ' + p[0].toFixed(0) + ',' + p[1].toFixed(0);
    } catch(e) {
      console.log("Tofixed error:" + typeof(p[0]) + " = " + e.toString());
    }
  }
  svgStr += '" fill="none" stroke="' + col + '" stroke-width="3"';
  //svgStr += '" style="fill:none;stroke:' + col + ';stroke-width:3" />';
  if(meta !== undefined) {
    svgStr += meta;  
  }
  svgStr += '/>';
  if(currentLineMode == segmentedLineMode && currentLineStart == dotLineStart) {
    var p = ln[0];
    svgStr += '<circle cx="'+ p[0].toFixed(0) + '" cy="' + p[1].toFixed(0)+ '" fill="' + col + '" r="' + knobRadius + '" />';
  }
  return svgStr;
}

function drawTracks(line_length) {   // not fully impletement - see generateSVG for proper line length limit 
  var temp_add = (currentLine.length >0);
  if(temp_add) 
		currentTrack.push({line:currentLine,color:currentTrackColor,times:currentTimes});
  // walk through tracks
  currentTrack.forEach(function(t){
    if(isColorHidden(t.color))
      return;
    var ln = t.line;
    if((line_length !== undefined) && (ln.length > line_length)) {
      ln = ln.slice(ln.length-line_length-1);  // only use the last 5 line segments
    }
    drawLines(ln,t.color);
  });
  if(temp_add)
    currentTrack.pop();  // remove the current line that was temporarily added
}

function drawLines(ln,col) {
  if(ln.length === 0)
    return;
  ctx1.beginPath();
  ctx1.strokeStyle = col;
  var p = ln[0];
  if(currentLineMode == segmentedLineMode && currentLineStart == dotLineStart) {
    ctx1.fillStyle = col;
    ctx1.beginPath();
    ctx1.arc(p[0], p[1], knobRadius, 0, 2 * Math.PI);
    ctx1.fill();
  }
  checkBounds(svgBounds,p);
  ctx1.moveTo(p[0],p[1]);  
  for(var i = 1; i < ln.length; i++) {
    //log(p);
    //log(svgStr);
    p = ln[i]; 
    checkBounds(svgBounds,p);
    ctx1.lineTo(p[0],p[1]);
    ctx1.stroke();
  }
}

function areSomePalettesHidden() {
  for(var i = 0; i < paletDivs.length; i++) {
    var bp = paletDivs[i];
    //console.log(bp.style.backgroundColor + " === " + color);
    if(bp.style.opacity === "")
      continue; // opacity is not an attribute yet
    if(bp.style.opacity < 1.0)  // this pallet box is transparent
      return true;
  }
  return false;
}

function isColorHidden(color) {
    if(selectedPalette !== null) {  // a palette is selected
      //console.log("color:" + color);
      //console.log("ccolor:" + currentTrackColor);
      //console.log("bcolor:" + selectedPalette.style.backgroundColor);
      //console.log("bcolor:" + selectedPalette.getAttribute("style"));
      return (currentTrackColor !== color);
    } else {    // no palette selected so show all except that with transparent boxes
      var hide = false;
      for(var i = 0; i < paletDivs.length; i++) {
        var bp = paletDivs[i];
        //console.log(bp.style.backgroundColor + " === " + color);
        if(bp.style.backgroundColor === color) {
          if(bp.style.opacity === "")
            return false; // opacity is not an attribute yet
          return (bp.style.opacity < 1.0);  // this pallet box is transparent
        }
      }
      return false;
    }
}

var tempAdd = false;  // current line needs to be temporarily added to tracks for saving and display

function tempTrack() {
  tempAdd = (currentLine.length >0);
  if(tempAdd)
		currentTrack.push({line:currentLine,color:currentTrackColor,times:currentTimes});
}

function unTempTrack() {
  if(tempAdd)
    currentTrack.pop();  // remove the current line that was temporarily added
}

// this assumes that formating is removed as well with an <xmp> tag
var new_line_str = "</xmp><xmp>";   //"&#10;";  - html ascii code doesn't work well as new line due to required xmp tag.
        
function generateSVG(beautify,line_length) {
  var svgStr = "";
  tempTrack();
  // walk through tracks
  //console.log("C:" + currentTrackColor);
  var tot_lng = 0;
  var start_i = 0;
  var end_i = currentTrack.length;
  var dir_i = 1;
  if(line_length !== undefined) { // need to go backwards for limited length
    start_i = end_i -1;
    end_i = -1;
    dir_i = -1;
  }
  for(var i = start_i; i != end_i; i += dir_i) {
    var t = currentTrack[i];
    console.log("Track of " + t.color + " has " + t.line.length + " long line");
    if(isColorHidden(t.color))
      continue;
    var meta_str = '';
    if(t.times.length > 0) {  
      meta_str = ' times="' + t.times + '"';
      //  console.log("Times:" + t.times.length);
      //for(var ti = 0; ti < t.times.length; ti++) {    
    //    var tm = t.times;
    //    meta_str += tm + ",";
    //  console.log("meta_str1:" + meta_str);
    //  }    
      //  meta_str += t.times;
      console.log("meta_str1:" + meta_str);
      //meta_str = meta_str.substring(0,meta_str.length-1);  // remove last comma
    //  meta_str += '"';
    }
    var ln = t.line;
    tot_lng += ln.length;
    console.log("line length:" + line_length + " ln length:" + ln.length);
    if(line_length !== undefined) {
      if(line_length === 0) {
        var p = ln[ln.length-1];
        svgStr += '<circle cx="'+ p[0].toFixed(0) + '" cy="' + p[1].toFixed(0)+ '" fill="' + t.color + '" r="' + knobRadius + '" />';
        break;  
      }
      if(tot_lng > line_length) {
        ln = ln.slice(tot_lng-line_length-1);  // only use the last line_length line segments
      }
    }
    svgStr += lineToSVG(ln,t.color,meta_str);
    if(beautify)
      svgStr += new_line_str;
    if(line_length !== undefined) {  
      if(tot_lng > line_length)  // visible line complete
      break;
    }
  }
  unTempTrack();
  //svgStr += lineToSVG(currentLine,currentTrackColor);  
  //log("SVG:" + svgStr);    
  return svgStr;    
}

function parseSvg(svgStr) {
    console.log("Type:" + (typeof svgStr));
    console.log("Attempting to parse svg file length:" + svgStr.length);
    var dom = (new DOMParser()).parseFromString(svgStr, "text/xml");
    var attribs = dom.documentElement.attributes;
    console.log(attribs);
    var attr;
    for(var j = 0; j < attribs.length; j++) {
        attr= attribs.item(j);
        //console.log(attr.nodeName);
        switch(attr.nodeName) {
            case "backimg":
                var bip = attr.nodeValue;
                if(bip !== backImgPath) {
                    if(confirm("The background image path for this file = " + bip + " does not match the current background image path = " + backImgPath + ". Do you wish to attempt to load this background image?")) {
                        backImgPath = bip;
                        attemptToLoadBackImg();
                    }
                }
                break;
            case "profiles":
                profileData = JSON.parse(attr.nodeValue.replace(/'/g, '"'));  // JSON needs double quotes
                break;
        }
    }
    var nodes = dom.documentElement.childNodes;
    for (var i = 0; i < nodes.length ;i++) {
        //console.log(nodes[i].nodeName + ": ");
        var node = nodes[i];
        if(node.nodeName == 'polyline') {
            //console.log("attr:" + node.attributes); 
            var l = [];
            var mt = [];
            attribs = node.attributes;
            var c = "#888";  //default color
            for(j = 0; j < attribs.length; j++) {
                attr= attribs.item(j);
                //console.log(attr.nodeName);
                switch(attr.nodeName) {
                    case 'points':
                        var pts = attr.nodeValue.trim().split(" ");
                        for(var pi  = 0; pi < pts.length; pi++) {
                          var p = pts[pi];
                          if(p.length > 0) {
                            //console.log(p);
                            var spts = p.split(",");
                            var x = parseFloat(spts[0]);
                            var y = parseFloat(spts[1]);
                            l.push([x,y]);
                          }
                        }
                        break;
                    case "stroke":
                        c = attr.nodeValue;
                        //console.log(c);
                        break;
                    case "times":
                        var times = attr.nodeValue.split(",");
                        for(var ti = 0; ti < times.length; ti++) {
                            var tm = times[ti];
                            //console.log(tm);
                            mt.push(parseFloat(tm));
                        }
                        break;
                }
            }
            var t = {line:l,color:c,times:mt};
            //console.log("Track:" + t);
            currentTrack.push(t);
        }
    }
    console.log("Polylines:" + currentTrack.length);
  trackToScreen();
}

function newLine() {
  if(currentLine.length > 0) {
    console.log("New line!"); 
    //log(currentTrack,currentLine,currentTrackColor,currentTimes)
    currentTrack.push({line:currentLine,color:currentTrackColor,times:currentTimes});
    currentLine = [];
    currentTimes = [];  
  }
}
        
function trackToScreen() {
  ctx1.clearRect(0, 0, ctx1.canvas.width, ctx1.canvas.height);
  var ll;
  if(selectedPalette !== null) {
    switch(currentLineLength) {
      case showLast20LineLength: 
        ll = 20;
        break;
      case showLast5LineLength: 
        ll = 5;
        break;
      case showLineDot:
        ll = 0;
        break;
      case showNoLine:
        break;
    }
  }
  if(!isIE) {  // IE has no SVG
    if(currentLineLength === showNoLine)
      svgView.innerHTML = "";
    else {
      var b = generateSVG(false,ll);
      //$("svgView").innerHTML = b; - no work as this is not window?
      svgView.innerHTML = b;
    }
  } else {
    drawTracks(ll);
  }
}

/* for touch screen pcs?
function is_touch_device() {  // https://ctrlq.org/code/19616-detect-touch-screen-javascript
 return (('ontouchstart' in window)
      || (navigator.MaxTouchPoints > 0)
      || (navigator.msMaxTouchPoints > 0));
}
*/

/* check for touch event handlers
if(window.MSPointerEvent){
    //you are on IE10
}else if(window.PointerEvent){
    //you are on IE11
}else if(window.TouchEvent){
    //android and safari
}else{
    //don't have touch events
}
*/
/* another method
var HAS_TOUCH = ('ontouchstart' in window);
*/

// good site for touch events: http://www.javascriptkit.com/javatutors/touchevents.shtml

var isTouchDown = false;

function touchStart(e) {
  //console.log("touch start:" + e);
  //e = e.originalEvent;
	var	x = e.changedTouches[0].pageX;
	var	y = e.changedTouches[0].pageY;
  mobileLog("Start touch:" + x + "," + y);
  drawStart(x,y);
  isTouchDown = true;
  e.preventDefault();
}

var isMouseDown = false;

function mouseDown(e) {
  e = e || event;
  var x = e.clientX;
  var y = e.clientY;
  mobileLog("Mouse down:" + x + "," + y);
  drawStart(x,y);
  isMouseDown = true;
  e.preventDefault();
}

function touchMove(e) {
  if(!isTouchDown)
    return;
  x = e.changedTouches[0].pageX;
	y = e.changedTouches[0].pageY;
	dragged = drawMove(x,y);
  e.preventDefault();
}

function mouseMove(e) {
  if(!isMouseDown)
    return;
  e = e || event;
  var x = e.clientX;
  var y = e.clientY;
  dragged = drawMove(x,y);
  e.preventDefault();
}
    
function touchEnd(e) {
  if(!isTouchDown)
    return;
  //e = e.originalEvent;
  var x = e.changedTouches[0].pageX;
  var y = e.changedTouches[0].pageY; 
  mobileLog("touch end:" + x + "," + y);    
  drawEnd(x,y);
  isTouchDown = false;
  e.preventDefault();
}

function mouseUp(e) {
  if(isMouseDown) {
    var x = e.clientX;
    var y = e.clientY;
    console.log("Mouse up:" + x + "," + y);  
    drawEnd(x,y);
  }
  isMouseDown = false;
  e.preventDefault();
}

function mouseLeave(e) {
  //if(isMouseDown)
  //  drawEnd(e);
  isMouseDown = false;
    e.preventDefault();
}

function touchCancel(e) {
    //if(isMouseDown)
    //drawEnd(e);
  isMouseDown = false;
    e.preventDefault();  
}

function drawEnd(x,y) {
  // if continuous then add start and end points to current line regardless
  // if broken then always make it a new line
  if(saverMode) {
    if(x < 40 && y < 40)
      hideAlternate();
    return;
  }
  y -= contentDiv.offsetTop;
  if(dragged) {
    if(Math.abs(x0 - x) < 10 && Math.abs(y0 - y) < 10)
      dragged = false;  // prevent false drags
  }
  if(!dragged && (currentLineMode === segmentedLineMode))
    return;  // nothing to do as this mode ignors clicks
  var broken_line = ((currentLineMode !== continuousLineMode) && (currentLineMode !== freeDrawLineMode));
  if(dragged && broken_line) {  // start new line segment
     newLine();
     console.log("Start new line");    
  }
  if(!dragged && (currentLineMode == "Auto")) {
  	x0 = x1;  // use previous ending
    y0 = y1;
    console.log("Use previous ending:" + x0 + "," + y0);
  }
  if(broken_line) {
    // as in broken line or very first line - start a new line
  	currentLine.push([x0,y0]);
    if(deleteTimes.length > 0) {  // this is a repair job, so use the old time stamp
      currentTimes.push(deleteTimes.pop());
    } else {
      if(baseTime === 0)
          baseTime = touchDownTime;
  	  currentTimes.push(touchDownTime - baseTime);
    }
  }
  x1 = x;
  y1 = y;
  if(dragged) {  // if not dragged then only a point 
    currentLine.push([x1,y1]);
    if(baseTime === 0)
        baseTime = Date.now();
    currentTimes.push(Date.now()-baseTime);
  }
  //milliseconds between midnight, January 1, 1970, and the current date and time
  mobileLog("End point:" + x + "," + y + " cl=" + currentLine.length);
  //ctx1.beginPath();
  //ctx1.moveTo(x0,y0);
  //ctx1.lineTo(x1,y1);
 	//ctx1.stroke();
  //transfer currentline to currentTrack
  trackToScreen();
  //log(document.getElementById("svgView").innerHTML);
  ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
  dragged = false;
  //console.log("Current backup mode:", currentBackupMode);
  if(currentBackupMode === saveOnEveryTouch)
    saveTrackLocal();
}

// onError: Failed to get the acceleration
function onError() {
    document.getElementById('debugConsole').innerHTML = 'ERROR';
}

var position = 0;

function changeBackupMode() {
  mobileLog("Current BackupMode:" + currentBackupMode);
  currentBackupMode = changeOption(currentBackupMode,[saveManual,saveOnEveryTouch,saveOnPaletteChange]);
  menus.BackupMode.innerHTML = "BackupMode = " + autoSaveStr[currentBackupMode];
  setConfig();
}

function changeLineMode() {
  mobileLog("Current line mode:" + currentLineMode);
  currentLineMode = changeOption(currentLineMode,[freeDrawLineMode,continuousLineMode,autoLineMode,segmentedLineMode]);
  menus.LineMode.innerHTML = "LineMode = " + lineModeStr[currentLineMode];
  setConfig();
}

function changeLineStart() {
  mobileLog("Current line start:" + currentLineStart);
  currentLineStart = changeOption(currentLineStart,[noneLineStart,dotLineStart]);
  menus.LineStart.innerHTML = "LineStart = " + lineStartStr[currentLineStart];
  setConfig();
}

function changeLineLength() {
  mobileLog("Current line length:" + currentLineLength);
  currentLineLength = changeOption(currentLineLength,[showAllLineLength,showLast20LineLength,showLast5LineLength,showLineDot,showNoLine]);
  menus.LineLength.innerHTML = "LineLength = " + lineLengthStr[currentLineLength];
  setConfig();
}

function changeOption(current,options) {
  for(var i = 0; i < options.length; i++) {
    if(options[i] == current) {
      i++;
      i %= options.length;
      return(options[i]);
    }
  }
  return options[0];    
}

function exportToTab() {
  newLine();
  openRecordWindow(false,true,false,false);
}

function exportClippedToTab() {
  newLine();
  openRecordWindow(false,true,false,true);
}

function exportToHTMLTab() {
  newLine();
  openRecordWindow(true,true,true,false);
}

function exportToTxtTab() {
  newLine();
  openRecordWindow(false,false,true,false);
}

function exportTracksToJsonTab() {
  newLine();
  openWindow("Track JSON",JSON.stringify({img:backImgPath,size:[backImg.width,backImg.height],tracks:currentTrack}));
}

function exportProfileToJsonTab() {
  newLine();
  openWindow("Profile JSON",JSON.stringify(profileData));
}


var recordWindow = null;
var svg_header = '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version= "1.1" ';

function createSvgTxt(beautify, clip_to_image) {
  var txt;
  if(clip_to_image)
    txt = svg_header + 'width="'+backImg.width+'" height="'+backImg.height + '"';
  else
    txt = svg_header + 'width="'+svgBounds.extremes[2].toFixed(0)+'" height="'+svgBounds.extremes[3].toFixed(0) + '"';
  txt += ' backimg="' + backImgPath + '"';
  if(Object.keys(profileData).length > 0)
    txt += ' profiles="' + JSON.stringify(profileData).replace(/"/g, "'") + '"';
  if(baseTime > 0)
      txt += ' basetime="' + baseTime + '"';
  txt += '>';
  if(beautify)
    txt += new_line_str;
  txt += generateSVG(beautify);
  txt += "</svg>";
  return txt;}
    

  /* generate a browser page which can be saved as a file	*/
        
function openRecordWindow(beautify, include_loader, remove_formating, clip_to_image) {
  var txt = "";
  if (include_loader) {
    txt += '<html><title>Track Data</title><head></head><body>';
  }
 //    txt += '<!DOCTYPE html><html><head><meta http-equiv="Content-type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, minimum-scale=1, initial-scale=1, user-scalable=no"></head><body>'
  if(remove_formating)
    txt += "<xmp>";
  //console.log("Current tracks:" + currentTrack.length);
  console.log('img width="'+backImg.width+'" height="'+backImg.height);
  txt += createSvgTxt(beautify, clip_to_image);
  if(remove_formating)
    txt += "</xmp>";
  if (include_loader) {
    txt += "</body></html>";
  }
  //console.log(txt);
  openWindow("track data",txt);
}

function openWindow(nm,txt) {
  if (recordWindow)
    recordWindow.close();
  recordWindow = window.open("", nm); //, "width=200, height=100");
  //var q = globals.paperGlue.getDoRecord();
  //var dri = globals.paperGlue.getDoIndex();
  recordWindow.document.write(txt);
  recordWindow.name = nm;
  if(!isIE)
    recordWindow.stop();
}

function addTextField(container,init_value,prompt) {
    var tf = document.createElement("textarea");
    tf.style.fontSize = "130%";
    tf.style.background = "#ffc";
    tf.cols = 40;
    tf.rows = 1;
    tf.innerHTML = init_value;
    if(prompt !== undefined) {
        var p = document.createElement("span");
        p.innerHTML = prompt;
        container.appendChild(p);
    }
    container.appendChild(tf);
    return tf;
}

var backImgTxt;
function selectBackgroundImg() {
  // called from menuIn item    
  menus.BackgroundImage.style.display = "none";
  menus.ImagePathTextEntry.innerHTML = "Select background image:";
  backImgTxt = addTextField(menus.ImagePathTextEntry,backImgPath);    
  addButton(menus.ImagePathTextEntry,"Select",onTextSelectBackgroundImg);
  addButton(menus.ImagePathTextEntry,"Default",onDefaultBackgroundImg);
  if(window.cordova !== undefined ) {
    addButton(menus.ImagePathTextEntry,"Browse",onBrowseBackgroundImg);  
  }
  menus.ImagePathTextEntry.style.display = "block"; 
}

var saverImgTxt;

function selectScreenSaverImg() {
  // called from menuIn item    
  menus.ScreenSaverImage.style.display = "none";
  menus.ImagePathTextEntry.innerHTML = "Select screensaver image:";
  saverImgTxt = addTextField(menus.ImagePathTextEntry,saverImgPath);    
  addButton(menus.ImagePathTextEntry,"Select",onTextSelectScreenSaverImg);
  addButton(menus.ImagePathTextEntry,"Default",onDefaultScreenSaverImg);
  if(window.cordova !== undefined ) {
    addButton(menus.ImagePathTextEntry,"Browse",onBrowseSaverImg());  
  }
  menus.ImagePathTextEntry.style.display = "block"; 
}

function addButton(container,content,call) {
    var btn = document.createElement("span");
    btn.innerHTML = content;
    btn.className = "button";
    container.appendChild(btn);
    btn.addEventListener("click",call);
}

function addOk(container,call) {
    addButton(container,"Okay",call);
}

function addOkCancel(container,call_ok,call_cancel){
    addButton(container,"Okay",call_ok);
    addButton(container,"Cancel",call_cancel);
}

var imageParser;

function backImageSelected() {
  // a selection has been made from the file browser    
  mobileLog("Image selected:" + this.innerHTML);
  backImgPath = currentListDirectory + '/' + this.innerHTML;
  if(currentDirEntry) {
      readFile(this.innerHTML,imageParser,"dataURL");  //not sure if I need to read as binary with readAsArrayBuffer
  }  // don't know how we could get here without
  selectImg(backImgPath,"id_chosen_img");
  menus.BackgroundImage.style.display = "block";
  menus.ImagePathTextEntry.style.display = "none";
  finiLoadImage();
}

function saverImageSelected() {
  // a selection has been made from the file browser    
  mobileLog("Image selected:" + this.innerHTML);
  saverImgPath = currentListDirectory + "/" + this.innerHTML;
  if(currentDirEntry) {
      readFile(this.innerHTML,imageParser,"dataURL");  //not sure if I need to read as binary with readAsArrayBuffer
  }  // don't know how we could get here without
  selectImg(saverImgPath,"id_chosen_saver_img");
  menus.ScreenSaverImage.style.display = "block";
  menus.ImagePathTextEntry.style.display = "none";
  finiLoadImage();
}


function finiLoadImage() {
  loadImageDirectory = currentListDirectory;  
  setConfig();
}

function parseBackImg(data) {
    console.log("Data:" + data.length);
    backImg.src = data;  // "data:image/png;base64," + btoa(data);
}

function parseSaverImg(data) {
    console.log("Data:" + data.length);
    saverImg.src = data;  // "data:image/png;base64," + btoa(data);
}

function onTextSelectBackgroundImg() {
  finiBackImgPathLocal(backImgTxt.value);
}
    
function finiBackImgPathLocal(pth) {
  backImgPath = pth;
  selectImg(backImgPath,"id_chosen_img");
  menus.BackgroundImage.style.display = "block";
  backImg.src = backImgPath;
  menus.ImagePathTextEntry.style.display = "none";
  setConfig();
  configureCanvas();
  rtnClick();  
}

function onDefaultBackgroundImg() {
  finiBackImgPathLocal(defaultBackImgPath); 
}

function onTextSelectScreenSaverImg() {
  finiSaverImgPathLocal(saverImgTxt.value);
}
    
function finiSaverImgPathLocal(pth) {
  saverImgPath = pth;
  selectImg(saverImgPath,"id_chosen_saver_img");
  menus.ScreenSaverImage.style.display = "block";
  saverImg.src = saverImgPath;
  menus.ImagePathTextEntry.style.display = "none";
  setConfig();
}

function onDefaultScreenSaverImg() {
  finiSaverImgPathLocal(defaultSaverImgPath);
}

function selectImg(pth,el_id) {
  setConfig();
  var chosenImgDiv = document.getElementById(el_id);
  chosenImgDiv.innerHTML = pth; 
  //var img_select_div = document.getElementById("id_img_select_div");
  //img_select_div.style.display = "none";
  rtnClick();
}


function onBrowseBackgroundImg() {
  // build list of available background images and directories
  currentListDirectory = loadImageDirectory;
  imageParser = parseBackImg;
  fileSelector(false,"png,jpg","Select image for background",backImageSelected,"img",finiLoadImage);
}

function onBrowseSaverImg() {
  // build list of available background images and directories
  currentListDirectory = loadImageDirectory;
  imageParser = parseSaverImg;
  fileSelector(false,"png,jpg","Select image for screen saver",saverImageSelected,"img",finiLoadImage);
}

var sliders = [];

function makeSlider(attrib, callback, existing_value) {
  var slider_div = document.createElement("div");
  slider_div.className = "slider-box";
  var slider_head = document.createElement("div");
  slider_head.className = "slider-heading";
  slider_head.innerHTML = attrib[0];
  slider_div.appendChild(slider_head);
  slider_div.style.background = attrib[1];
  var slider_pre = document.createElement("div");
  slider_pre.className = "slider-pre";
  slider_pre.innerHTML = attrib[2];
  slider_div.appendChild(slider_pre);
  var slider_post = document.createElement("div");
  slider_post.className = "slider-post";
  slider_post.innerHTML = attrib[3];
  slider_div.appendChild(slider_post);
  var slider_bar = document.createElement("div");
  slider_bar.className = "slider-bar";
  slider_div.appendChild(slider_bar);
  var slider_slide = document.createElement("div");
  slider_slide.className = "slider-slide";
  slider_bar.appendChild(slider_slide);
  var min = attrib[4];
  var max = attrib[5];
  var val = attrib[6];
  var minstr = min;
  var maxstr = max;
  if(attrib.length > 8) {
    minstr = attrib[7];
    maxstr = attrib[8];
  }
  var slider_min = document.createElement("div");
  slider_min.className = "slider-min";
  slider_min.innerHTML = minstr;
  slider_div.appendChild(slider_min);
  var slider_val = document.createElement("val");
  slider_val.className = "slider-val";
  var n = 0;
  if(max < 10)
    n = 2;
  if(existing_value) {
    val = parseFloat(existing_value);
    slider_val.innerHTML = val.toFixed(n);
    var set_perc = (val - min)/(max - min);
    slider_slide.style.width = (set_perc * 100) + '%';
  } else {
    slider_val.innerHTML = 'Not Set';
    slider_slide.style.width = '0%';
  }
  slider_div.appendChild(slider_val);
  var slider_max = document.createElement("div");
  slider_max.className = "slider-max";
  slider_max.innerHTML = maxstr;
  slider_div.appendChild(slider_max);
  slider_div.addEventListener("mouseup", sliderChange, false);
  sliders.push({name:attrib[0],value:val,min:min,max:max,bar:slider_bar,slide:slider_slide,status:slider_val,box:slider_div,callback:callback});
  return slider_div;
}

function sliderChange(e) {
  console.log(typeof this);
  for(var i = 0; i < sliders.length; i++) {
    var slider = sliders[i];
    if(slider.box === this) {
      console.log("Slider " + slider.name + " x:" + e.clientX);
      var set_perc = ((((e.clientX - slider.bar.offsetLeft) / slider.bar.offsetWidth)).toFixed(2));
      set_perc = Math.min(Math.max(set_perc,0.0),1.0);
      slider.slide.style.width = (set_perc * 100) + '%';
      slider.value = set_perc*(slider.max - slider.min) + slider.min;
      var n = 0;
      if(slider.max < 10)
        n = 2;
      slider.status.innerHTML = slider.value.toFixed(n);
        slider.callback(slider.name,slider.value.toFixed(n));
    }
  }
}

function makeSliders(sl,callback,existing_data) {
  var sliders_div = document.createElement("div");
  for(var i= 0; i < sl.length; i++) {
    var existing_value;  
    if(existing_data)
      existing_value = existing_data[sl[i][0]];
    else
      existing_value = null;
    var div = makeSlider(sl[i],callback,existing_value);
    sliders_div.appendChild(div);
    div.style.top = (100 + i*60) + 'px';
  }
  //sliders_div.style.top = "10%";
  return sliders_div;  
}


function valueCall(type,value) {
  var pal = paletteLookup[currentTrackColor];
  if(!profileData.hasOwnProperty(pal))
    profileData[pal] = {};  //first entry for this profile
  profileData[pal][type] = value;
}

var firstUseOfNotes = true;

function showAlternate() {
  console.log("Show alternate");
  saverImg.style.width = "100%";
  saverDiv.style.display = "block";
  saverMode = true;
  if(firstUseOfNotes) {  // not set yet
    firstUseOfNotes = false;  
    var iw = window.innerWidth; //saverImg.clientHeight;
    var ih = window.innerHeight; //saverImg.clientWidth;
    console.log("Window:" + iw + "," + ih);
    canvas3.setAttribute("width",iw + "px");
    canvas3.setAttribute("height",ih + "px");
    var msg = "Click top left to exit.";
    if(hasLocalStorage)
      msg += " Notes will be saved to local storage.";
    alert(msg);
    if(saverLine.length === 0) {
      if(confirm("Do you wish to load previous notes if any? (Previous notes will otherwise be lost)"))
        loadSaverNotes(true);
    }
  }
  ctx3.strokeStyle = "#888";
  ctx3.lineWidth = 2;
  saverLine.forEach(function(pnts) {
    ctx3.beginPath();
    ctx3.moveTo(pnts[0],pnts[1]);
    ctx3.lineTo(pnts[2],pnts[3]);
    ctx3.stroke();
  });
}

function hideAlternate() {
  console.log("Hide alternate");
  if(hasLocalStorage) {
    var notes = JSON.stringify(saverLine);
    console.log("Size of notes:" + notes.length);
    if(notes.length > 1000000) {
      if(confirm("Notes data currently at " + (notes.length/1000) + ". Do you wish to save to local storage?"))
        localStorage.setItem("notes",notes);
    } else
      localStorage.setItem("notes",notes);
  }
  saverDiv.style.display = "none";
  saverMode = false;
}

function loadSaverNotes(already_there) {
  console.log("Load Screen Saver Notes");
  var lns = localStorage.getItem("notes");
  if(lns)
    saverLine = JSON.parse(lns);
  console.log("A:" + already_there);
  if(already_there !== true) {  // this is a call from the menu section
    rtnClick();
    showAlternate();
  }  
}

function showLineInstr() {
  profileDiv.innerHTML = '<h3>Line Drawing Instructions</h3><p>There are 4 line modes that can be selected from the "InMenu":</p><ul><li>FreeDraw - touch and drag to create equally spaced line segments.</li><li>Continuous - either drag or click to create a line segment which is part of a continous line.</li><li>Auto - clicks are continuous, drags are not, just try it out.</li><li>Segmented - Only dragging will create individual line segments.  This works best with LineStart = dot.  The idea is to show the visitors location and direction of gaze.</li></ul><p>Line length options limit the segments shown while a palette is selected.</p><p>There are also undo, destructive undo and redo buttons.  If a line is undone and then redrawn, an attempt will be made to reuse the original time stamp, but naturally these times will be suspect.</p>';
  addInstrBtns([["Contents",showInstructions]]);  
}

function showPaletteInstr() {
    profileDiv.innerHTML = '<h3>Palette Instructions</h3><p>Each palette color is intended to represent the tracks of a visitor.  The last palette selected will color the drawn lines even if no palette is currently selected. When the app is first opened the red palette is effectively the last palette selected.</p><p>Only the tracks for the selected palette are shown. Deselect a palette by clicking on it a second time, then all lines and all segments will be shown - unless a palette is disabled. To disable a palette, touch and hold for 1 second. Do the same to re-enable.</p><p>Note that only the tracks lines visibile will be saved and a warning will be issued if a single palette is selected or a palette is disabled.</p>';
    addInstrBtns([["Contents",showInstructions]]);
}

function showStorageInstr() {
    profileDiv.innerHTML = '<h3>Storage Instructions</h3><p>For the mobile app version of this application, track storage is to the default external storage directory for the device being used.  This may use a removable memory card (e.g. SD card) or flash memory internal to the device but still viewable by other apps or by a connected PC.</p><p>Tracks are stored in the SVG format which can be viewed as a vector drawing or as text. The SVG file could be edited with a vector graphics program but meta data may not be retained on saving.  The SVG format conforms to the XML protocol.</p><p>Tracks are saved as polylines.</p><p>Time stamps for the line segments in the tracks are saved as an additional attribute with each "polyline" tag.  A "basetime" (millseconds since the start of 1970) is saved as an additional attribe with the "svg" tag. Track profiles (if any) are saved as an additional attribute with the "svg" tag.  Both the time and profile data are only accessible using a text editor or bespoke program.</p><p>Note that track data uses co-ordinates based on the currently scaled background image. This width and height are stored as an attribute in the "svg" tag to allow correct scaling of the data.<p>For the web app version of this application, only local storage is available for backup and option settings (except for Internet Explorer). Additional menu out options are available to copy the track data out to a new web page which can be saved using the browsers file save commands.</p>';
    addInstrBtns([["Backup",showBackupInstr],["Contents",showInstructions]]);
}

function showBackupInstr() {
    profileDiv.innerHTML = '<h3>Backup Instruction</h3><p>For the mobile app version, the save icon on the tool bar will either save to the last save location or open a file browser to select a new location.  The latter will occur at start up and after selecting "New" from the "InMenu".  Save location can also be selected from the "OutMenu".  The default file path is based on the current time in milliseconds since the start of 1970.</p><p>There are three modes of session backup selected in the "OutMenu":</p><ul><li>Manual - Its up to you to occassionally go to the "OutMenu" and select "Save to local storage".</li><li>OnPaletteChange - each time a new a palette is selected, tracks will be saved to local storage.</li><li>OnEveryTouch - this will save with every stroke but will be brutal on the device flash memory and may shorten memory device life.  There is also the risk that you will erase the previous backup before realising the problem.</li></ul><p>Backups are retrieved from the "InMenu" LoadBackup option.</p>';
    addInstrBtns([["Contents",showInstructions]]);
}

function showImageInstr() {
    profileDiv.innerHTML = '<h3>Image Selection Instruction</h3><p>In the "InMenu", both background and screen saver images can be selected.  In the web app version only the images pre-saved in the apps "img" folder can be accessed.  For the mobile app, images stored in the external storage directory can also be used.  Selected images will be reloaded automatically on app startup.  If the images have gone missing the default "img/SpiderMap.png" will be loaded.</p><p>If "BackgroundImage" or "ScreenSaverImage" are selected, then a text field and some buttons appear.  The "Select" button will attempt to load the image from the path described in the text field. The "Default" button will restore the path to the SpiderMap image. On the mobile app version, the "Browse" button will allow selection for any compatible image in the external storage.</p>';
    addInstrBtns([["Storage",showStorageInstr],["Contents",showInstructions]]);
}

function showProfileInstr() {
    profileDiv.innerHTML = '<h3>Profile Instruction</h3><p>If time allows, an approximate profile of the visitor can be made to allow some filtering of the data.  Only those values that are adjusted are saved.</p><p>To enter profile information, select a palette and then the stalker icon.  Then click on the position on the slider for the appropriate characteristic that best matches the visitor being tracked.</p>';
    addInstrBtns([["Storage",showStorageInstr],["Contents",showInstructions]]);
}

function showScreenSaverInstr() {
    profileDiv.innerHTML = '<h3>Screen Saver Instruction</h3><p>A screen saver is viewable by clicking on the pencil icon or any area between the stalker icon and the redo box. In the screen saver window, notes can be made and these will be saved to local storage on exit.  There are not export options for these notes but you can use a screen shot to save them if necessary.</p><p>Leaving the screen saver is done by click on the top left of the screen.</p><p>The image used for the screen saver can be selected from the image selector in the "InMenu".</p>';
    addInstrBtns([["Contents",showInstructions]]);
}

function showInstructions() {
    profileDiv.innerHTML = '<h3>Instructions</h3><p>Select a palette box and then drag the cursor over the background image in the path that a visitor takes through your gallery.</p><p>The start and end of each line segment is time stamped.</p><p>Good luck stalking.</p>';
    addInstrBtns([["Lines",showLineInstr],
                  ["Palette",showPaletteInstr],
                  ["Storage",showStorageInstr],
                  ["Backup",showBackupInstr],
                  ["ImageSelection",showImageInstr],
                  ["Profiles",showProfileInstr],
                  ["ScreenSaver",showScreenSaverInstr],
                  ["About",showAbout]]);
}

function addInstrBtn(txt,call) {
    var btn = document.createElement("button");
    btn.addEventListener("click", call, false);
    btn.innerHTML = txt;
    profileDiv.appendChild(btn);   
}

function addInstrBtns(section_list) {
    for(var i in section_list) {
        var bv = section_list[i];
        addInstrBtn(bv[0],bv[1]);
    }
}

function showAbout() {
  profileDiv.innerHTML ='<h2>About Gallery Stalker</h2><p><i>Gallery Stalker V0.3 was written by Robert Parker in Sept 2016 and is released under the MIT licence</p><p>A copy of the licence and source code are available at http://grapevine.com.au/~wisteria/index.html or https://github.com/pyblendnet-js</p><p><b>This app is only to be used by gallery staff for the evaluation of exhibitions and shall not be used to break any local laws or infringe visitor privacy.</b></i></p>';
  addInstrBtn("INSTRUCTIONS",showInstructions);
}

function showProfile() {
  if(selectedPalette === null) {
    profileDiv.innerHTML = '<p style="text-align:center;">Select palette for track profile</p>';
    addInstrBtn("All about TRACK PROFILES",showProfileInstr);
  } else {
    var pal = paletteLookup[currentTrackColor];
    profileDiv.innerHTML = '<div style="display: inline-block;">Track profile for ' + pal + ' track: </div><div class="palette" style="background:'+ currentTrackColor + '; color:#fff; display: inline-block; position: relative; top: 10px"></div>';
    var v=[["Age","#FF0","Young","Old",0,100,10],
           ["Gender","#0FF","Male","Female",-100,100,0],
           ["Wealth","#FC0","Poor","Rich",0,100,50],
           ["Vert","#F0F","Intro","Extro",-100,100,0,"Inventor(e.g.:S.Wozniak)","Entrepreneur(e.g.:S.Jobs)"],  // type, pre, post, min, max, default, mintip,maxtip
           ["GroupSize","#FCC","Alone","Class",1,40,3],
           ["Dependants","#CCF","None","Many",0,40,0],
           ["Mood","#CCC","Grumpy","Happy",-100,100,0],
           ["Interest","#CFC","Little","Lots",-100,100,0]]; 
    profileDiv.appendChild(makeSliders(v,valueCall,profileData[pal]));
  }
  goPage('profile');
}

function showHelp() {
  showInstructions();
  goPage('profile');  // useful as an empty page
}
