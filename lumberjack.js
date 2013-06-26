/*
	Usage:

		// pass a selector to query or a DOM object directly
		var l = new Lumber('#my-textarea');

		// optionally override the prefix function
		l.prefix = function() { ... };

		// start logging!
		l.log('Hello, world!');

	So you want to have a log for debugging or otherwise, but you want:

	1.	Memory and CPU usage to stay low, even as the log gets large.
		Solved by using <textarea> instead of <pre>.

	2.	Autoscrolling like a terminal, only when scrolled to the bottom.
		Solved by comparing scrollTop to (scrollHeight - clientHeight).

	3.	Scroll position to stay the same when pushing a new line.
		Solved by saving the old scrollTop and restoring it afterwards.

	4.	Selection range or caret location to persist when logging.
		Here be dragons.

	It would seem as simple as saving selectionStart/selectionEnd and then
	writing back those properties afterwards. This works in Chrome.

	In Firefox, however, doing this makes restoring the scroll position fail
	because it appears that Firefox doesn't like to scroll a <textarea> to a
	position where the caret/selection is invisible, UNLESS a redraw has
	completed in between restoring the selection and restoring the
	scroll position.

	Furthermore, in IE, setting the selection range during a mouse selection
	essentially releases the mouse, finishing the selection abruptly.

	I thought of a number of possible solutions to this:

	*	Using setSelectionRange instead of setting the properties: this
		makes no difference at all.

	*	Allowing for a redraw before restoring the scroll position, by
		using setTimeout(..., 0): this works, but creates a flicker that
		is both unsightly and causes selections to get thrown around.

	*	Buffering output instead of updating the <textarea> when not
		scrolled to the bottom: this fixes the issues because we're no
		longer restoring any selection, as it was never reset to begin
		with.

	Non-standard properties used:

	*	<textarea>.clientHeight is read to obtain the height of the
		'viewport' inside the device, without the horizontal scrollbar.
		There doesn't appear to be an equivalent standard method to get
		this information.

	*	<textarea>.wrap is set to 'off' to suppress text wrapping.
		Although non-standard, it has better support than setting the
		'white-space: nowrap;' CSS property (which works in Chrome but
		not Firefox, for example).
*/

"use strict";

function Lumber(device) {
	var that = this;
	var buffer = '';
	var timers = {};
	var groups = 0;

	if (typeof device == 'string')
		device = document.querySelector(device);
	device.value = '';
	device.wrap = 'off';

	function push(text) {
		var old = device.scrollTop;
		var start = device.selectionStart;
		var end = device.selectionEnd;
		var bottom = old >= device.scrollHeight - device.clientHeight;
		var groupIndent = Array(1 + 4 * groups).join(' ');
		var update = groupIndent + that.prefix() + text + '\n';
		if (bottom) {
			device.value += buffer + update;
			buffer = '';
			device.scrollTop = device.scrollHeight;
		} else {
			buffer += update;
			device.scrollTop = old;
		}
	}

	this.prefix = function() {
		return +new Date + ': ';
	};
	this.log = function() {
		var a = Array.prototype.slice.call(arguments);
		push(a.join(' '));
	};
	this.error = function() {
		var a = Array.prototype.slice.call(arguments);
		this.log.apply(this, ['(E)'].concat(a));
	};
	this.warn = function() {
		var a = Array.prototype.slice.call(arguments);
		this.log.apply(this, ['(W)'].concat(a));
	};
	this.info = function() {
		var a = Array.prototype.slice.call(arguments);
		this.log.apply(this, ['(i)'].concat(a));
	};
	this.time = function(name) {
		if (!timers[name]) {
			timers[name] = +new Date;
			this.log(name + ': timer started');
		}
	};
	this.timeEnd = function(name) {
		if (timers[name]) {
			var d = new Date - timers[name];
			this.log(name + ': ' + d + ' ms');
			delete timers[name];
		}
	};
	this.group = function() {
		groups++;
	};
	this.groupEnd = function() {
		if (groups > 0)
			groups--;
	};
}
