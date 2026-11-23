var VSHADER_SOURCE=
`
attribute vec4 a_Position;
attribute float a_Size;
attribute vec4 a_Color;
attribute vec2 a_TexCoord;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;

varying vec4 v_Color;
varying vec2 v_TexCoord;

void main(){
    gl_PointSize=a_Size;
    gl_Position=u_ProjMatrix*u_ViewMatrix*u_ModelMatrix*a_Position;
    v_Color=a_Color;
    v_TexCoord=a_TexCoord;
}
`;

var FSHADER_SOURCE=
`
#ifdef GL_ES
precision mediump float;
#endif
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
varying vec4 v_Color;
// gl_FragCoord
void main(){
    vec4 texColor=texture2D(u_Sampler,v_TexCoord);
    gl_FragColor=texColor;
    // gl_FragColor=texColor * v_Color;
}
`

var canvas;
var gl;

var vertexCount;
var drawMode;

var a_Position;
var a_Size;
var a_Color;
var a_TexCoord;

var u_ModelMatrix;
var u_ViewMatrix;
var u_ProjMatrix;
var u_Sampler;

var viewMatrix;
var projMatrix;
var modelMatrix;

var rotationAngle;
var scaleFactor;
var translation;

var texture;
var texImage;
var isTextureReady;

var pointBuffer = [];

function main(){
    initContextAndShaders();
    lookupAttributeUniformLocations();
    setupVertexBuffers();
    startAnimationLoop();
}

function initContextAndShaders(){
    canvas = document.getElementById('webgl');
    gl = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.enable(gl.DEPTH_TEST);

    vertexCount = 4;
    drawMode = gl.TRIANGLE_STRIP;
    texture = gl.createTexture();
    texImage = new Image();
    texImage.onload = onTextureImageLoaded;
    texImage.src = '../resources/tex/wall.jpg';

    rotationAngle = 0.0;
    scaleFactor = 1.0;
    translation = [0.0, 0.0];
    modelMatrix = new Matrix4();
    viewMatrix = new Matrix4();
    viewMatrix.setLookAt(0,0,5,1,0,0,0,1,0);
    projMatrix = new Matrix4();
    // projMatrix.setOrtho(-1.0,1.0,-1.0,1.0,-1.0,1.0);
    projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    isTextureReady = false;
}

function lookupAttributeUniformLocations(){
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    a_Size = gl.getAttribLocation(gl.program, 'a_Size');
    a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
}

function setupVertexBuffers(){
    var vertices = new Float32Array([
        -0.5,0.5,
        -0.5,-0.5,
        0.5,0.5,
        0.5,-0.5,
    ]);
    var sizes = new Float32Array([
        10,
        20,
        30,
        40,
    ]);
    var colors = new Float32Array([
        1.0,0.0,0.0,
        0.0,1.0,0.0,
        0.0,0.0,1.0,
        1.0,1.0,1.0,
    ]);
    var texCoords = new Float32Array([
        0.0,1.0,
        0.0,0.0,
        1.0,1.0,
        1.0,0.0,
    ]);

    var positionBuffer = gl.createBuffer();
    var pointSizeBuffer = gl.createBuffer();
    var colorBuffer = gl.createBuffer();
    var texCoordBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Size, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Size);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Color);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_TexCoord);
}

function updateModelMatrix(){
    modelMatrix.setTranslate(translation[0], translation[1], 0);
    modelMatrix.rotate(rotationAngle, 0, 0, 1);
    modelMatrix.scale(scaleFactor, scaleFactor, 1);
}

function uploadMatricesToUniform(){
    // gl.vertexAttrib3f(a_Position,0.0,0.0,0.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
}

function clearFramebuffer(){
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function render(){
    // canvas.onmousedown=function(ev){pointOnClick(ev);};
    if(!isTextureReady) return;
    gl.drawArrays(drawMode, 0, vertexCount);
}

function pointOnClick(ev){
    var rect=ev.target.getBoundingClientRect();
    var x=((ev.clientX-rect.left)-canvas.width/2)/(canvas.width/2);
    var y=(canvas.height/2-(ev.clientY-rect.top))/(canvas.height/2);
    pointBuffer.push(x);pointBuffer.push(y);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    var len=pointBuffer.length;
    for(var i=0;i<len;i+=2){
        gl.vertexAttrib3f(a_Position,pointBuffer[i],pointBuffer[i+1],0.0);
        gl.drawArrays(gl.POINTS,0,1);
    }
}

function onTextureImageLoaded(){
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texImage);
    gl.uniform1i(u_Sampler, 0);
    isTextureReady = true;
}

function startAnimationLoop(){
    rotationAngle += 1;
    updateModelMatrix();
    uploadMatricesToUniform();
    clearFramebuffer();
    render();
    requestAnimationFrame(startAnimationLoop);
}
