
	var curLine=1;
	var curUrl=1;
	var fileContents=[];
	function saveName(fn,winName){
        
		$("#"+winName).parent().append("<span class='fileName' id="+winName+"'>"+fn+"</span>");
		$("#"+winName).hide();
	}
	function removeFile(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function removeUrl(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function showContents(me){
		if (me.contentWindow.location.href.substring(me.contentWindow.location.href.lastIndexOf("/")+1) != "fileFrame.html") {
			//for (n in me.contentWindow.document){
				var de=me.contentWindow.document.documentElement;
				var wname = me.name;
				
				if (de.nodeName.substring(0,3).toLowerCase()=="tei"){
					fileContents.push({"name":wname,"file":$(me).next().text(),"text":"<"+de.nodeName+">"+de.innerHTML+"</"+de.nodeName+">"});
				}
				else{
					fileContents.push({"name":wname,"file":$(me).next().text(),"text":de.getElementsByTagName("body")[0].innerHTML});

					//fileContents.push(de.getElementsByTagName("body")[0].innerHTML);
				}
			//}
			//alert(JSON.stringify(me.contentWindow.document));
			
			
		}
	}
	function newFileLine(){
	
	fileLine = "<div class='fileLine'><span class='fileBox'><iframe frameborder=0 name='file"+curLine+"' id='file"+curLine+"' class='fileFrame' onload='showContents(this)' src='/frames/fileFrame.html'> </iframe></span><span onclick='removeFile(this)' class='divLink'>Remove</span></div>";
	$("#allFiles").append($(fileLine));
	curLine++;
	return;
	}
	function newUrl(){
		var urlLine = "<div><input type='text' name='url"+curUrl+"' id='url"+curUrl+"' class='textfieldX'/><span id='removeUrl' onclick='removeUrl(this)' class='divLink'>X</span></div>";
		$("#allUrls").append($(urlLine));
		curUrl++;
	}
	function showSubmitted(){
		
	}
	function parseString(){
		// From http://www.w3schools.com/Xml/xml_parser.asp
		if (window.DOMParser) {
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(txt, "text/xml");
		}
		else // Internet Explorer
		{
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = "false";
			xmlDoc.loadXML(txt);
		}
	}
	function listTexts(name,val,txtStr,targetId){
			
		$("#"+targetId).append("<li id='li_"+name+"'><input type='checkbox' name='sel_li_"+name+"' id='sel_li_"+name+"'></input>"+val+"</li>");
		
		
		txtContent = txtStr.substring(txtStr.indexOf("<text"));
		var teiTexts = txtContent.split("</text>");
		var lastli = $("#li_"+name);
		$("#li_"+name).append("<ul></ul>");
		for (var j = 1; j < teiTexts.length-1; j++){
			$("#li_"+name).find("ul").append("<li id='li_"+name+"_"+j+"'><input type='checkbox' name='sel_li_"+name+"_"+j+"' id='sel_li_"+name+"_"+j+"'></input>text "+j+"</li>");
		}
	}
	function submitForm(){
		var allData="";
		var uriNames =[];
		var uriVals = [];
		$.each($(".textfieldX"),function(index,value){
			if ($(value).val().length > 0) {
			
				allData = allData + $(value).attr("name") + "=" + $(value).val() + "&";
				uriNames.push($(value).attr("name"));
				uriVals.push($(value).val());
			}
		});
		for (var i=0;i<fileContents.length;i++){
			var allData = allData+fileContents[i].name+"="+fileContents[i].text+"&";
		}
			
		allData = allData.substring(0,allData.length-1);
	
		$.ajax({
			url: "/return_texts",
			data: allData,
			type: "POST",
			success: function(response){
				$("#submittedFileList").html("");
				if (uriNames.length > 0) {
					for (var i = 0; i < uriNames.length; i++) {
						
						listTexts(uriNames[i], uriVals[i], response[""+uriNames[i]][0].content, "submittedFileList");
					}
				}
				if (fileContents.length > 0) {
					for (var i = 0; i < fileContents.length; i++) {
						listTexts(fileContents[i].name, fileContents[i].file, response[""+fileContents[i].name][0].content, "submittedFileList");
					}
				}
			}
		});
	}
	function getData(){
		
	}
	$(document).ready(function(e){
		
		newFileLine();
		newUrl();
		$("#addAnother").click(function(e){
			newFileLine();
		});
		$("#addAnotherUrl").click(function(e){
			newUrl();
		});
		
		
	});
