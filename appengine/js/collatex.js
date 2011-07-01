
	var curUrl=1;

	function removeUrl(fileRemove){
		$(fileRemove).parent().remove();
		
	}

	function newUrl(){
		var urlLine = "<div><input type='text' name='url"+curUrl+"' id='url"+curUrl+"' class='textfieldX'/><div id='removeUrl' onclick='removeUrl(this)' class='divLink ui-button-icon-primary ui-icon ui-icon-cancel' style='float: right; margin-right: 15px; margin-top:2px;'></div></div>";
		$("#allUrls").append($(urlLine));
		curUrl++;
	}

    function listTexts(name,val,txtjson,targetId){
			
	        var sig = txtjson["autosigil"];
		if (!sig) {
		    sig = 'A';
		}
		$("#"+targetId).append("<li id='li_"+name+"'><input type='checkbox' checked='true' value='"+name+"' name='sel_li_"+name+"' id='sel_li_"+name+"'></input><input type='text' class='textfieldX sigil' name='"+name+"_sigil' id='"+name+"_sigil' value='"+sig+"'/><span class='text_name'>"+val+"</span></li>");
		//txtContent = txtStr.substring(txtStr.indexOf("<text"));
		//var teiTexts = txtContent.split("</text>");
		var lastli = $("#li_"+name);
	
		if ((txtjson)&&(txtjson["subtexts"])) {
			$("#li_" + name).append("<ul></ul>");
			for (var j = 0; j < txtjson["subtexts"].length; j++) {
				$("#li_" + name).find("ul").append("<li id='li_" + name + "_" + j + "'><input type='checkbox' checked='true' value='"+name+"_"+j+"' name='sel_li_" + name + "_" + j + "' id='sel_li_" + name + "_" + j + "'></input>text " + (j+1) + "</li>");
			}
		}
		
	}

	// {"corpus.xml": [{"text": "6N_U0J3vhnQ4IUv_gkGCDw==-0", 
	//              "autosigil": "B", "parent": null}, {"text": 
	//              "6N_U0J3vhnQ4IUv_gkGCDw==-1", "autosigil": "C", 
	//              "parent": null}], "group.xml": [{"text": 
	//              "2w_FiYkh7SJuBIEph_W0Ug==-0", "autosigil": "D", 
	//              "parent": null}], "plain.txt": [{"text": 
	//              "3Vo0CVvDyqd9V7wTzGIeCQ==-0", "autosigil": "A", 
	//              "parent": null}]}
	// $("#"+targetId).append("<li id='li_"+name+"'><input type='checkbox' checked='true' value='"+name+"'
	//  name='sel_li_"+name+"' id='sel_li_"+name+"'></input>
	// <input type='text' class='textfieldX sigil' name='"+name+"_sigil'
	//  id='"+name+"_sigil' value='"+sig+"'/><span class='text_name'>"+val+"</span></li>");
	
	function submitForm(){
		urls = $('#choosefile').serialize();
		$.getJSON('/return_texts', urls, function(data){
			$('#submittedFileList').html('');
			if( data ) {$('#submitted_div').show();}
			$.each(data, function(key, val) {
				$.each(val, function(keyy, vall) {
					console.log( keyy + ">>" + vall );
				}); 
				$('#submittedFileList').append( '<li class="uploaded_file_name">' + key + '</li>' );
				console.log( key + ":" + val );
			});
		});
	}
	
	function getTokens(){
		fuzzymatch = $("#fuzzymatch").is(':checked');
		collator = $("#collatorUL input:radio:checked").val();
		output = $("#outputUL input:radio:checked").val();
		texts = $("#submittedFileList input:checkbox:checked");
		query = "fuzzymatch="+fuzzymatch+"&output="+output+"&collator="+collator;
		
		for(var i=0;i<texts.length;i++){
			var textName = $(texts[i]).val();
			var textParts = textName.split("_");
			
			var thisUrl = firstResponse[""+textParts[0]]; 
			
			if (textParts.length > 2) {
			    thisUrl = thisUrl[parseInt(textParts[1])].subtexts[parseInt(textParts[1])];
			    query = query + "&" + $(texts[i]).val() + "=" + JSON.stringify(thisUrl);
			}
			else {
			    var fieldName = "#" + textName + "_sigil";
			    var sigil = $(fieldName).val();
			    thisUrl = thisUrl[parseInt(textParts[1])];
			    thisUrl["sigil"] = sigil;
			    query = query + "&" + $(texts[i]).val() + "=" + JSON.stringify(thisUrl);
			}
		}
		
			$.ajax({
				"url": "/run_toolchain",
				"data": query,
				"type": "POST",
				"async": false,
				"dataType": "json",
				"success": function(resp){
				        $("#collatedResult").val(resp.result);
					$("#Resultform").attr("action", resp.formaction);
					for (var i=0; i < resp.buttons.length; i++) {
					    $("#resultButton").append("<input type='submit' name='" + i + "' value='" + resp.buttons[i] + "'>");
					}
				}
			});
		
		
	}
	$(document).ready(function(e){
		newUrl();
		$("#addAnotherUrl").click(function(e){
			newUrl();
		});
		
		
	});
