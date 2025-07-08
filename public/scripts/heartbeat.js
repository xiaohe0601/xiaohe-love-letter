(function () {
  const _face = new THREE.Triangle();
  const _color = new THREE.Vector3();

  class MeshSurfaceSampler {

    constructor(mesh) {
      let geometry = mesh.geometry;

      if (!geometry.isBufferGeometry || geometry.attributes.position.itemSize !== 3) {
        throw new Error("THREE.MeshSurfaceSampler: Requires BufferGeometry triangle mesh.");
      }

      if (geometry.index) {
        console.warn("THREE.MeshSurfaceSampler: Converting geometry to non-indexed BufferGeometry.");
        geometry = geometry.toNonIndexed();
      }

      this.geometry = geometry;
      this.randomFunction = Math.random;
      this.positionAttribute = this.geometry.getAttribute("position");
      this.colorAttribute = this.geometry.getAttribute("color");
      this.weightAttribute = null;
      this.distribution = null;
    }

    setWeightAttribute(name) {
      this.weightAttribute = name ? this.geometry.getAttribute(name) : null;
      return this;
    }

    build() {
      const positionAttribute = this.positionAttribute;
      const weightAttribute = this.weightAttribute;
      const faceWeights = new Float32Array(positionAttribute.count / 3);

      for (let i = 0; i < positionAttribute.count; i += 3) {
        let faceWeight = 1;
        if (weightAttribute) {
          faceWeight = weightAttribute.getX(i) + weightAttribute.getX(i + 1) + weightAttribute.getX(i + 2);
        }

        _face.a.fromBufferAttribute(positionAttribute, i);
        _face.b.fromBufferAttribute(positionAttribute, i + 1);
        _face.c.fromBufferAttribute(positionAttribute, i + 2);

        faceWeight *= _face.getArea();
        faceWeights[i / 3] = faceWeight;
      }

      this.distribution = new Float32Array(positionAttribute.count / 3);
      let cumulativeTotal = 0;

      for (let i = 0; i < faceWeights.length; i++) {
        cumulativeTotal += faceWeights[i];
        this.distribution[i] = cumulativeTotal;
      }

      return this;
    }

    setRandomGenerator(randomFunction) {
      this.randomFunction = randomFunction;
      return this;
    }

    sample(targetPosition, targetNormal, targetColor) {
      const cumulativeTotal = this.distribution[this.distribution.length - 1];
      const faceIndex = this.binarySearch(this.randomFunction() * cumulativeTotal);
      return this.sampleFace(faceIndex, targetPosition, targetNormal, targetColor);
    }

    binarySearch(x) {
      const dist = this.distribution;
      let start = 0;
      let end = dist.length - 1;
      let index = -1;

      while (start <= end) {
        const mid = Math.ceil((start + end) / 2);

        if (mid === 0 || dist[mid - 1] <= x && dist[mid] > x) {
          index = mid;
          break;
        } else if (x < dist[mid]) {
          end = mid - 1;
        } else {
          start = mid + 1;
        }
      }

      return index;
    }

    sampleFace(faceIndex, targetPosition, targetNormal, targetColor) {
      let u = this.randomFunction();
      let v = this.randomFunction();

      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }

      _face.a.fromBufferAttribute(this.positionAttribute, faceIndex * 3);
      _face.b.fromBufferAttribute(this.positionAttribute, faceIndex * 3 + 1);
      _face.c.fromBufferAttribute(this.positionAttribute, faceIndex * 3 + 2);

      targetPosition.set(0, 0, 0).addScaledVector(_face.a, u).addScaledVector(_face.b, v).addScaledVector(_face.c, 1 - (u + v));

      if (targetNormal !== undefined) {
        _face.getNormal(targetNormal);
      }

      if (targetColor !== undefined && this.colorAttribute !== undefined) {
        _face.a.fromBufferAttribute(this.colorAttribute, faceIndex * 3);
        _face.b.fromBufferAttribute(this.colorAttribute, faceIndex * 3 + 1);
        _face.c.fromBufferAttribute(this.colorAttribute, faceIndex * 3 + 2);

        _color.set(0, 0, 0).addScaledVector(_face.a, u).addScaledVector(_face.b, v).addScaledVector(_face.c, 1 - (u + v));

        targetColor.r = _color.x;
        targetColor.g = _color.y;
        targetColor.b = _color.z;
      }
      return this;
    }

  }

  THREE.MeshSurfaceSampler = MeshSurfaceSampler;
})();

(function () {
  const _object_pattern = /^[og]\s*(.+)?/;
  const _material_library_pattern = /^mtllib /;
  const _material_use_pattern = /^usemtl /;
  const _map_use_pattern = /^usemap /;

  const _vA = new THREE.Vector3();
  const _vB = new THREE.Vector3();
  const _vC = new THREE.Vector3();
  const _ab = new THREE.Vector3();
  const _cb = new THREE.Vector3();

  function ParserState() {
    const state = {
      objects: [],
      object: {},
      vertices: [],
      normals: [],
      colors: [],
      uvs: [],
      materials: {},
      materialLibraries: [],
      startObject: function (name, fromDeclaration) {
        if (this.object && this.object.fromDeclaration === false) {
          this.object.name = name;
          this.object.fromDeclaration = fromDeclaration !== false;
          return;
        }

        const previousMaterial = this.object && typeof this.object.currentMaterial === "function" ? this.object.currentMaterial() : undefined;

        if (this.object && typeof this.object._finalize === "function") {
          this.object._finalize(true);
        }

        this.object = {
          name: name || "",
          fromDeclaration: fromDeclaration !== false,
          geometry: {
            vertices: [],
            normals: [],
            colors: [],
            uvs: [],
            hasUVIndices: false
          },
          materials: [],
          smooth: true,
          startMaterial: function (name, libraries) {
            const previous = this._finalize(false);

            if (previous && (previous.inherited || previous.groupCount <= 0)) {
              this.materials.splice(previous.index, 1);
            }

            const material = {
              index: this.materials.length,
              name: name || "",
              mtllib: Array.isArray(libraries) && libraries.length > 0 ? libraries[libraries.length - 1] : "",
              smooth: previous !== undefined ? previous.smooth : this.smooth,
              groupStart: previous !== undefined ? previous.groupEnd : 0,
              groupEnd: -1,
              groupCount: -1,
              inherited: false,
              clone: function (index) {
                const cloned = {
                  index: typeof index === "number" ? index : this.index,
                  name: this.name,
                  mtllib: this.mtllib,
                  smooth: this.smooth,
                  groupStart: 0,
                  groupEnd: -1,
                  groupCount: -1,
                  inherited: false
                };
                cloned.clone = this.clone.bind(cloned);
                return cloned;
              }
            };
            this.materials.push(material);
            return material;
          },
          currentMaterial: function () {
            if (this.materials.length > 0) {
              return this.materials[this.materials.length - 1];
            }
            return undefined;
          },
          _finalize: function (end) {
            const lastMultiMaterial = this.currentMaterial();

            if (lastMultiMaterial && lastMultiMaterial.groupEnd === -1) {
              lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
              lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
              lastMultiMaterial.inherited = false;
            }

            if (end && this.materials.length > 1) {
              for (let mi = this.materials.length - 1; mi >= 0; mi--) {
                if (this.materials[mi].groupCount <= 0) {
                  this.materials.splice(mi, 1);
                }
              }
            }

            if (end && this.materials.length === 0) {
              this.materials.push({
                name: "",
                smooth: this.smooth
              });
            }

            return lastMultiMaterial;
          }
        };

        if (previousMaterial && previousMaterial.name && typeof previousMaterial.clone === "function") {
          const declared = previousMaterial.clone(0);
          declared.inherited = true;
          this.object.materials.push(declared);
        }

        this.objects.push(this.object);
      },
      finalize: function () {
        if (this.object && typeof this.object._finalize === "function") {
          this.object._finalize(true);
        }
      },
      parseVertexIndex: function (value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 3) * 3;
      },
      parseNormalIndex: function (value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 3) * 3;
      },
      parseUVIndex: function (value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 2) * 2;
      },
      addVertex: function (a, b, c) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;
        dst.push(src[a + 0], src[a + 1], src[a + 2]);
        dst.push(src[b + 0], src[b + 1], src[b + 2]);
        dst.push(src[c + 0], src[c + 1], src[c + 2]);
      },
      addVertexPoint: function (a) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;
        dst.push(src[a + 0], src[a + 1], src[a + 2]);
      },
      addVertexLine: function (a) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;
        dst.push(src[a + 0], src[a + 1], src[a + 2]);
      },
      addNormal: function (a, b, c) {
        const src = this.normals;
        const dst = this.object.geometry.normals;
        dst.push(src[a + 0], src[a + 1], src[a + 2]);
        dst.push(src[b + 0], src[b + 1], src[b + 2]);
        dst.push(src[c + 0], src[c + 1], src[c + 2]);
      },
      addFaceNormal: function (a, b, c) {
        const src = this.vertices;
        const dst = this.object.geometry.normals;

        _vA.fromArray(src, a);
        _vB.fromArray(src, b);
        _vC.fromArray(src, c);
        _cb.subVectors(_vC, _vB);
        _ab.subVectors(_vA, _vB);
        _cb.cross(_ab);
        _cb.normalize();

        dst.push(_cb.x, _cb.y, _cb.z);
        dst.push(_cb.x, _cb.y, _cb.z);
        dst.push(_cb.x, _cb.y, _cb.z);
      },
      addColor: function (a, b, c) {
        const src = this.colors;
        const dst = this.object.geometry.colors;
        if (src[a] !== undefined) {
          dst.push(src[a + 0], src[a + 1], src[a + 2]);
        }
        if (src[b] !== undefined) {
          dst.push(src[b + 0], src[b + 1], src[b + 2]);
        }
        if (src[c] !== undefined) {
          dst.push(src[c + 0], src[c + 1], src[c + 2]);
        }
      },
      addUV: function (a, b, c) {
        const src = this.uvs;
        const dst = this.object.geometry.uvs;
        dst.push(src[a + 0], src[a + 1]);
        dst.push(src[b + 0], src[b + 1]);
        dst.push(src[c + 0], src[c + 1]);
      },
      addDefaultUV: function () {
        const dst = this.object.geometry.uvs;
        dst.push(0, 0);
        dst.push(0, 0);
        dst.push(0, 0);
      },
      addUVLine: function (a) {
        const src = this.uvs;
        const dst = this.object.geometry.uvs;
        dst.push(src[a + 0], src[a + 1]);
      },
      addFace: function (a, b, c, ua, ub, uc, na, nb, nc) {
        const vLen = this.vertices.length;
        let ia = this.parseVertexIndex(a, vLen);
        let ib = this.parseVertexIndex(b, vLen);
        let ic = this.parseVertexIndex(c, vLen);
        this.addVertex(ia, ib, ic);
        this.addColor(ia, ib, ic);

        if (na !== undefined && na !== "") {
          const nLen = this.normals.length;
          ia = this.parseNormalIndex(na, nLen);
          ib = this.parseNormalIndex(nb, nLen);
          ic = this.parseNormalIndex(nc, nLen);
          this.addNormal(ia, ib, ic);
        } else {
          this.addFaceNormal(ia, ib, ic);
        }

        if (ua !== undefined && ua !== "") {
          const uvLen = this.uvs.length;
          ia = this.parseUVIndex(ua, uvLen);
          ib = this.parseUVIndex(ub, uvLen);
          ic = this.parseUVIndex(uc, uvLen);
          this.addUV(ia, ib, ic);
          this.object.geometry.hasUVIndices = true;
        } else {
          this.addDefaultUV();
        }
      },
      addPointGeometry: function (vertices) {
        this.object.geometry.type = "Points";
        const vLen = this.vertices.length;

        for (let vi = 0, l = vertices.length; vi < l; vi++) {
          const index = this.parseVertexIndex(vertices[vi], vLen);
          this.addVertexPoint(index);
          this.addColor(index);
        }
      },
      addLineGeometry: function (vertices, uvs) {
        this.object.geometry.type = "Line";
        const vLen = this.vertices.length;
        const uvLen = this.uvs.length;

        for (let vi = 0, l = vertices.length; vi < l; vi++) {
          this.addVertexLine(this.parseVertexIndex(vertices[vi], vLen));
        }

        for (let uvi = 0, l = uvs.length; uvi < l; uvi++) {
          this.addUVLine(this.parseUVIndex(uvs[uvi], uvLen));
        }
      }
    };

    state.startObject("", false);

    return state;
  }

  class OBJLoader extends THREE.Loader {

    constructor(manager) {
      super(manager);
      this.materials = null;
    }

    load(url, onLoad, onProgress, onError) {
      const scope = this;
      const loader = new THREE.FileLoader(this.manager);
      loader.setPath(this.path);
      loader.setRequestHeader(this.requestHeader);
      loader.setWithCredentials(this.withCredentials);
      loader.load(url, function (text) {
        try {
          onLoad(scope.parse(text));
        } catch (e) {
          if (onError) {
            onError(e);
          } else {
            console.error(e);
          }

          scope.manager.itemError(url);
        }
      }, onProgress, onError);
    }

    setMaterials(materials) {
      this.materials = materials;
      return this;
    }

    parse(text) {
      const state = new ParserState();

      if (text.indexOf("\r\n") !== -1) {
        text = text.replace(/\r\n/g, "\n");
      }

      if (text.indexOf("\\\n") !== -1) {
        text = text.replace(/\\\n/g, "");
      }

      const lines = text.split("\n");
      let line = "";
      let lineFirstChar = "";
      let lineLength = 0;
      let result = [];

      const trimLeft = typeof "".trimStart() === "function";

      for (let i = 0, l = lines.length; i < l; i++) {
        line = lines[i];
        line = trimLeft ? line.trimStart() : line.trim();
        lineLength = line.length;

        if (lineLength === 0) {
          continue;
        }

        lineFirstChar = line.charAt(0);

        if (lineFirstChar === "#") {
          continue;
        }

        if (lineFirstChar === "v") {
          const data = line.split(/\s+/);

          switch (data[0]) {
            case "v":
              state.vertices.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
              if (data.length >= 7) {
                state.colors.push(parseFloat(data[4]), parseFloat(data[5]), parseFloat(data[6]));
              } else {
                state.colors.push(undefined, undefined, undefined);
              }
              break;
            case "vn":
              state.normals.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
              break;
            case "vt":
              state.uvs.push(parseFloat(data[1]), parseFloat(data[2]));
              break;
          }
        } else if (lineFirstChar === "f") {
          const lineData = line.substring(1).trim();
          const vertexData = lineData.split(/\s+/);
          const faceVertices = [];

          for (let j = 0, jl = vertexData.length; j < jl; j++) {
            const vertex = vertexData[j];

            if (vertex.length > 0) {
              const vertexParts = vertex.split("/");
              faceVertices.push(vertexParts);
            }
          }

          const v1 = faceVertices[0];

          for (let j = 1, jl = faceVertices.length - 1; j < jl; j++) {
            const v2 = faceVertices[j];
            const v3 = faceVertices[j + 1];
            state.addFace(v1[0], v2[0], v3[0], v1[1], v2[1], v3[1], v1[2], v2[2], v3[2]);
          }
        } else if (lineFirstChar === "l") {
          const lineParts = line.substring(1).trim().split(" ");
          let lineVertices = [];
          const lineUVs = [];

          if (line.indexOf("/") === -1) {
            lineVertices = lineParts;
          } else {
            for (let li = 0, llen = lineParts.length; li < llen; li++) {
              const parts = lineParts[li].split("/");
              if (parts[0] !== "") {
                lineVertices.push(parts[0]);
              }
              if (parts[1] !== "") {
                lineUVs.push(parts[1]);
              }
            }
          }

          state.addLineGeometry(lineVertices, lineUVs);
        } else if (lineFirstChar === "p") {
          const lineData = line.substring(1).trim();
          const pointData = lineData.split(" ");
          state.addPointGeometry(pointData);
        } else if ((result = _object_pattern.exec(line)) !== null) {
          const name = (" " + result[0].substring(1).trim()).substring(1);
          state.startObject(name);
        } else if (_material_use_pattern.test(line)) {
          state.object.startMaterial(line.substring(7).trim(), state.materialLibraries);
        } else if (_material_library_pattern.test(line)) {
          state.materialLibraries.push(line.substring(7).trim());
        } else if (_map_use_pattern.test(line)) {
          console.warn("THREE.OBJLoader: Rendering identifier 'usemap' not supported. Textures must be defined in MTL files.");
        } else if (lineFirstChar === "s") {
          result = line.split(" ");

          if (result.length > 1) {
            const value = result[1].trim().toLowerCase();
            state.object.smooth = value !== "0" && value !== "off";
          } else {
            state.object.smooth = true;
          }

          const material = state.object.currentMaterial();
          if (material) {
            material.smooth = state.object.smooth;
          }
        } else {
          if (line === "\0") {
            continue;
          }
          console.warn(`THREE.OBJLoader: Unexpected line: ${line}`);
        }
      }

      state.finalize();

      const container = new THREE.Group();
      container.materialLibraries = [].concat(state.materialLibraries);

      const hasPrimitives = !(state.objects.length === 1 && state.objects[0].geometry.vertices.length === 0);

      if (hasPrimitives === true) {
        for (let i = 0, l = state.objects.length; i < l; i++) {
          const object = state.objects[i];
          const geometry = object.geometry;
          const materials = object.materials;
          const isLine = geometry.type === "Line";
          const isPoints = geometry.type === "Points";
          let hasVertexColors = false; // Skip o/g line declarations that did not follow with any faces

          if (geometry.vertices.length === 0) {
            continue;
          }
          const buffergeometry = new THREE.BufferGeometry();
          buffergeometry.setAttribute("position", new THREE.Float32BufferAttribute(geometry.vertices, 3));

          if (geometry.normals.length > 0) {
            buffergeometry.setAttribute("normal", new THREE.Float32BufferAttribute(geometry.normals, 3));
          }

          if (geometry.colors.length > 0) {
            hasVertexColors = true;
            buffergeometry.setAttribute("color", new THREE.Float32BufferAttribute(geometry.colors, 3));
          }

          if (geometry.hasUVIndices === true) {
            buffergeometry.setAttribute("uv", new THREE.Float32BufferAttribute(geometry.uvs, 2));
          }

          const createdMaterials = [];

          for (let mi = 0, miLen = materials.length; mi < miLen; mi++) {
            const sourceMaterial = materials[mi];
            const materialHash = sourceMaterial.name + "_" + sourceMaterial.smooth + "_" + hasVertexColors;
            let material = state.materials[materialHash];

            if (this.materials !== null) {
              // mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
              material = this.materials.create(sourceMaterial.name);

              if (isLine && material && !(material instanceof THREE.LineBasicMaterial)) {
                const materialLine = new THREE.LineBasicMaterial();
                THREE.Material.prototype.copy.call(materialLine, material);
                materialLine.color.copy(material.color);
                material = materialLine;
              } else if (isPoints && material && !(material instanceof THREE.PointsMaterial)) {
                const materialPoints = new THREE.PointsMaterial({
                  size: 10,
                  sizeAttenuation: false
                });
                THREE.Material.prototype.copy.call(materialPoints, material);
                materialPoints.color.copy(material.color);
                materialPoints.map = material.map;
                material = materialPoints;
              }
            }

            if (material === undefined) {
              if (isLine) {
                material = new THREE.LineBasicMaterial();
              } else if (isPoints) {
                material = new THREE.PointsMaterial({
                  size: 1,
                  sizeAttenuation: false
                });
              } else {
                material = new THREE.MeshPhongMaterial();
              }

              material.name = sourceMaterial.name;
              material.flatShading = !sourceMaterial.smooth;
              material.vertexColors = hasVertexColors;
              state.materials[materialHash] = material;
            }

            createdMaterials.push(material);
          }

          let mesh;

          if (createdMaterials.length > 1) {
            for (let mi = 0, miLen = materials.length; mi < miLen; mi++) {
              const sourceMaterial = materials[mi];
              buffergeometry.addGroup(sourceMaterial.groupStart, sourceMaterial.groupCount, mi);
            }

            if (isLine) {
              mesh = new THREE.LineSegments(buffergeometry, createdMaterials);
            } else if (isPoints) {
              mesh = new THREE.Points(buffergeometry, createdMaterials);
            } else {
              mesh = new THREE.Mesh(buffergeometry, createdMaterials);
            }
          } else {
            if (isLine) {
              mesh = new THREE.LineSegments(buffergeometry, createdMaterials[0]);
            } else if (isPoints) {
              mesh = new THREE.Points(buffergeometry, createdMaterials[0]);
            } else {
              mesh = new THREE.Mesh(buffergeometry, createdMaterials[0]);
            }
          }

          mesh.name = object.name;
          container.add(mesh);
        }
      } else {
        if (state.vertices.length > 0) {
          const material = new THREE.PointsMaterial({
            size: 1,
            sizeAttenuation: false
          });

          const buffergeometry = new THREE.BufferGeometry();
          buffergeometry.setAttribute("position", new THREE.Float32BufferAttribute(state.vertices, 3));

          if (state.colors.length > 0 && state.colors[0] !== undefined) {
            buffergeometry.setAttribute("color", new THREE.Float32BufferAttribute(state.colors, 3));
            material.vertexColors = true;
          }

          const points = new THREE.Points(buffergeometry, material);
          container.add(points);
        }
      }

      return container;
    }

  }

  THREE.OBJLoader = OBJLoader;
})();

(function () {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setClearColor(0xff5555);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = 1;

  const controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.noPan = true;
  controls.maxDistance = 3;
  controls.minDistance = 0.7;

  const group = new THREE.Group();
  scene.add(group);

  let heart = null;
  let sampler = null;
  let originHeart = null;
  new THREE.OBJLoader().load("/assets/objects/heartbeat.obj", (obj) => {
    heart = obj.children[0];
    heart.geometry.rotateX(-Math.PI * 0.5);
    heart.geometry.scale(0.04, 0.04, 0.04);
    heart.geometry.translate(0, -0.4, 0);
    group.add(heart);

    heart.material = new THREE.MeshBasicMaterial({
      color: 0xff5555
    });
    originHeart = Array.from(heart.geometry.attributes.position.array);
    sampler = new THREE.MeshSurfaceSampler(heart).build();
    init();
    renderer.setAnimationLoop(render);
  });

  let positions = [];
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff
  });
  const lines = new THREE.LineSegments(geometry, material);
  group.add(lines);

  const simplex = new SimplexNoise();
  const pos = new THREE.Vector3();

  class Grass {
    constructor() {
      sampler.sample(pos);
      this.pos = pos.clone();
      this.scale = Math.random() * 0.01 + 0.001;
      this.one = null;
      this.two = null;
    }

    update(a) {
      const noise = simplex.noise4D(this.pos.x * 1.5, this.pos.y * 1.5, this.pos.z * 1.5, a * 0.0005) + 1;
      this.one = this.pos.clone().multiplyScalar(1.01 + (noise * 0.15 * beat.a));
      this.two = this.one.clone().add(this.one.clone().setLength(this.scale));
    }
  }

  const spikes = [];

  function init() {
    positions = [];
    for (let i = 0; i < 20000; i++) {
      const g = new Grass();
      spikes.push(g);
    }
  }

  const beat = { a: 0 };
  gsap.timeline({
    repeat: -1,
    repeatDelay: 0.3
  }).to(beat, {
    a: 1.2,
    duration: 0.6,
    ease: "power2.in"
  }).to(beat, {
    a: 0.0,
    duration: 0.6,
    ease: "power3.out"
  });
  gsap.to(group.rotation, {
    y: Math.PI * 2,
    duration: 12,
    ease: "none",
    repeat: -1
  });

  function render(a) {
    positions = [];
    spikes.forEach((g) => {
      g.update(a);
      positions.push(g.one.x, g.one.y, g.one.z);
      positions.push(g.two.x, g.two.y, g.two.z);
    });
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));

    const vs = heart.geometry.attributes.position.array;
    for (let i = 0; i < vs.length; i += 3) {
      const v = new THREE.Vector3(originHeart[i], originHeart[i + 1], originHeart[i + 2]);
      const noise = simplex.noise4D(originHeart[i] * 1.5, originHeart[i + 1] * 1.5, originHeart[i + 2] * 1.5, a * 0.0005) + 1;
      v.multiplyScalar(1 + (noise * 0.15 * beat.a));
      vs[i] = v.x;
      vs[i + 1] = v.y;
      vs[i + 2] = v.z;
    }
    heart.geometry.attributes.position.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
})();