/*
 * StatusNet - a distributed open-source microblogging tool
 * Copyright (C) 2008, StatusNet, Inc.
 *
 * Add a notice encoded as JSON into the current timeline
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @category  Plugin
 * @package   StatusNet
 * @author    Evan Prodromou <evan@status.net>
 * @author    Sarven Capadisli <csarven@status.net>
 * @copyright 2009 StatusNet, Inc.
 * @license   http://www.fsf.org/licensing/licenses/agpl-3.0.html GNU Affero General Public License version 3.0
 * @link      http://status.net/
 */

// TODO: i18n

RealtimeUpdate = {
     _userid: 0,
     _replyurl: '',
     _favorurl: '',
     _deleteurl: '',
     _updatecounter: 0,
     _maxnotices: 50,
     _windowhasfocus: true,
     _documenttitle: '',
     _paused:false,
     _queuedNotices:[],

     init: function(userid, replyurl, favorurl, deleteurl)
     {
        RealtimeUpdate._userid = userid;
        RealtimeUpdate._replyurl = replyurl;
        RealtimeUpdate._favorurl = favorurl;
        RealtimeUpdate._deleteurl = deleteurl;

        RealtimeUpdate._documenttitle = document.title;

        $(window).bind('focus', function(){ RealtimeUpdate._windowhasfocus = true; });

        $(window).bind('blur', function() {
          $('#notices_primary .notice').removeClass('mark-top');

          $('#notices_primary .notice:first').addClass('mark-top');

          RealtimeUpdate._updatecounter = 0;
          document.title = RealtimeUpdate._documenttitle;
          RealtimeUpdate._windowhasfocus = false;

          return false;
        });
     },

     receive: function(data)
     {
          if (RealtimeUpdate._paused === false) {
              RealtimeUpdate.purgeLastNoticeItem();

              RealtimeUpdate.insertNoticeItem(data);
          }
          else {
              RealtimeUpdate._queuedNotices.push(data);

              RealtimeUpdate.updateQueuedCounter();
          }

          RealtimeUpdate.updateWindowCounter();
     },

     insertNoticeItem: function(data) {
        // Don't add it if it already exists
        if ($("#notice-"+data.id).length > 0) {
            return;
        }

        var noticeItem = RealtimeUpdate.makeNoticeItem(data);
        var noticeItemID = $(noticeItem).attr('id');

        $("#notices_primary .notices").prepend(noticeItem);
        $("#notices_primary .notice:first").css({display:"none"});
        $("#notices_primary .notice:first").fadeIn(1000);

        SN.U.FormXHR($('#'+noticeItemID+' .form_favor'));
        SN.U.NoticeReplyTo($('#'+noticeItemID));
        SN.U.NoticeWithAttachment($('#'+noticeItemID));
     },

     purgeLastNoticeItem: function() {
        if ($('#notices_primary .notice').length > RealtimeUpdate._maxnotices) {
            $("#notices_primary .notice:last").remove();
        }
     },

     updateWindowCounter: function() {
          if (RealtimeUpdate._windowhasfocus === false) {
              RealtimeUpdate._updatecounter += 1;
              document.title = '('+RealtimeUpdate._updatecounter+') ' + RealtimeUpdate._documenttitle;
          }
     },

     makeNoticeItem: function(data)
     {
          user = data['user'];
          html = data['html'].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
          source = data['source'].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');

          ni = "<li class=\"hentry notice\" id=\"notice-"+data['id']+"\">"+
               "<div class=\"entry-title\">"+
               "<span class=\"vcard author\">"+
               "<a href=\""+user['profile_url']+"\" class=\"url\">"+
               "<img src=\""+user['profile_image_url']+"\" class=\"avatar photo\" width=\"48\" height=\"48\" alt=\""+user['screen_name']+"\"/>"+
               "<span class=\"nickname fn\">"+user['screen_name']+"</span>"+
               "</a>"+
               "</span>"+
               "<p class=\"entry-content\">"+html+"</p>"+
               "</div>"+
               "<div class=\"entry-content\">"+
               "<a class=\"timestamp\" rel=\"bookmark\" href=\""+data['url']+"\" >"+
               "<abbr class=\"published\" title=\""+data['created_at']+"\">a few seconds ago</abbr>"+
               "</a> "+
               "<span class=\"source\">"+
               "from "+
                "<span class=\"device\">"+source+"</span>"+ // may have a link
               "</span>";
          if (data['in_reply_to_status_id']) {
               ni = ni+" <a class=\"response\" href=\""+data['in_reply_to_status_url']+"\">in context</a>";
          }

          ni = ni+"</div>"+
            "<div class=\"notice-options\">";

          if (RealtimeUpdate._userid != 0) {
               var input = $("form#form_notice fieldset input#token");
               var session_key = input.val();
               ni = ni+RealtimeUpdate.makeFavoriteForm(data['id'], session_key);
               ni = ni+RealtimeUpdate.makeReplyLink(data['id'], data['user']['screen_name']);
               if (RealtimeUpdate._userid == data['user']['id']) {
                    ni = ni+RealtimeUpdate.makeDeleteLink(data['id']);
               }
          }

          ni = ni+"</div>"+
               "</li>";
          return ni;
     },

     makeFavoriteForm: function(id, session_key)
     {
          var ff;

          ff = "<form id=\"favor-"+id+"\" class=\"form_favor\" method=\"post\" action=\""+RealtimeUpdate._favorurl+"\">"+
                "<fieldset>"+
               "<legend>Favor this notice</legend>"+
               "<input name=\"token-"+id+"\" type=\"hidden\" id=\"token-"+id+"\" value=\""+session_key+"\"/>"+
               "<input name=\"notice\" type=\"hidden\" id=\"notice-n"+id+"\" value=\""+id+"\"/>"+
               "<input type=\"submit\" id=\"favor-submit-"+id+"\" name=\"favor-submit-"+id+"\" class=\"submit\" value=\"Favor\" title=\"Favor this notice\"/>"+
                "</fieldset>"+
               "</form>";
          return ff;
     },

     makeReplyLink: function(id, nickname)
     {
          var rl;
          rl = "<a class=\"notice_reply\" href=\""+RealtimeUpdate._replyurl+"?replyto="+nickname+"\" title=\"Reply to this notice\">Reply <span class=\"notice_id\">"+id+"</span></a>";
          return rl;
        },

     makeDeleteLink: function(id)
     {
          var dl, delurl;
          delurl = RealtimeUpdate._deleteurl.replace("0000000000", id);

          dl = "<a class=\"notice_delete\" href=\""+delurl+"\" title=\"Delete this notice\">Delete</a>";

          return dl;
     },

     initActions: function(url, timeline, path)
     {
        $('#notices_primary').prepend('<ul id="realtime_actions"><li id="realtime_playpause"></li><li id="realtime_timeline"></li></ul>');

        RealtimeUpdate._pluginPath = path;

        RealtimeUpdate.initPlayPause();
        RealtimeUpdate.initAddPopup(url, timeline, RealtimeUpdate._pluginPath);
        RealtimeUpdate.addNoticesHover();
     },

     initPlayPause: function()
     {
        RealtimeUpdate.showPause();
     },

     showPause: function()
     {
        RealtimeUpdate._paused = false;
        RealtimeUpdate.showQueuedNotices();

        $('#realtime_playpause').remove();
        $('#realtime_actions').prepend('<li id="realtime_playpause"><button id="realtime_pause" class="pause" title="Pause">Pause</button></li>');

        $('#realtime_pause').bind('click', function() {
            RealtimeUpdate.removeNoticesHover();
            RealtimeUpdate.showPlay();
            return false;
        });
     },

     showPlay: function()
     {
        RealtimeUpdate._paused = true;

        $('#realtime_playpause').remove();
        $('#realtime_actions').prepend('<li id="realtime_playpause"><span id="queued_counter"></span> <button id="realtime_play" class="play" title="Play">Play</button></li>');

        $('#realtime_play').bind('click', function() {
            RealtimeUpdate.addNoticesHover();
            RealtimeUpdate.showPause();
            return false;
        });
     },

     showQueuedNotices: function()
     {
        $.each(RealtimeUpdate._queuedNotices, function(i, n) {
            RealtimeUpdate.insertNoticeItem(n);
        });

        RealtimeUpdate._queuedNotices = [];

        RealtimeUpdate.removeQueuedCounter();
     },

     updateQueuedCounter: function()
     {
        $('#realtime_playpause #queued_counter').html('('+RealtimeUpdate._queuedNotices.length+')');
     },

     removeQueuedCounter: function()
     {
        $('#realtime_playpause #queued_counter').empty();
     },

     addNoticesHover: function()
     {
        $('#notices_primary .notices').hover(
            function() {
                if (RealtimeUpdate._paused === false) {
                    RealtimeUpdate.showPlay();
                }
            },
            function() {
                if (RealtimeUpdate._paused === true) {
                    RealtimeUpdate.showPause();
                }
            }
        );
     },

     removeNoticesHover: function()
     {
        $('#notices_primary .notices').unbind('hover');
     },

     initAddPopup: function(url, timeline, path)
     {
         $('#realtime_timeline').append('<button id="realtime_popup" title="Pop up in a window">Pop up</button>');

         $('#realtime_popup').bind('click', function() {
             window.open(url,
                         '',
                         'toolbar=no,resizable=yes,scrollbars=yes,status=no,menubar=no,personalbar=no,location=no,width=500,height=550');

             return false;
         });
     },

     initPopupWindow: function()
     {
         $('.notices .entry-title a, .notices .entry-content a').bind('click', function() {
            window.open(this.href, '');
            
            return false;
         });

         $('#showstream .entity_profile').css({'width':'69%'});
     }
}

